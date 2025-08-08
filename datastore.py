import streamlit as st
from pinecone import Pinecone as PineconeClient
from langchain.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain.vectorstores import Pinecone
from langchain.chains.question_answering import load_qa_chain
import os
import tempfile

# --- UI Configuration ---
st.set_page_config(page_title="PDF Query with Gemini", layout="wide")
st.title("📄 PDF Query System with Gemini and Pinecone")
st.markdown("""
<style>
    .stApp {
        background-color: #f0f2f6;
    }
    .stButton>button {
        background-color: #1a73e8; /* Google Blue */
        color: white;
        border-radius: 12px;
        padding: 10px 24px;
        border: none;
        font-size: 16px;
    }
    .stTextInput>div>div>input {
        border-radius: 10px;
        border: 2px solid #1a73e8;
    }
</style>
""", unsafe_allow_html=True)


# --- API Key and Environment Setup ---
with st.sidebar:
    st.header("🔑 API Configuration")
    google_api_key = st.text_input("Enter your Google API Key:", type="password")
    pinecone_api_key = st.text_input("Enter your Pinecone API Key:", type="password")
    pinecone_environment = st.text_input("Enter your Pinecone Environment:", placeholder="e.g., gcp-starter")
    pinecone_index_name = st.text_input("Enter your Pinecone Index Name:", placeholder="e.g., gemini-vector-index")

    # Set environment variables for LangChain and Pinecone
    if google_api_key:
        os.environ["GOOGLE_API_KEY"] = google_api_key
    if pinecone_api_key:
        os.environ["PINECONE_API_KEY"] = pinecone_api_key
    if pinecone_environment:
        os.environ["PINECONE_ENVIRONMENT"] = pinecone_environment

def setup_pinecone():
    """Initializes and validates Pinecone connection."""
    if pinecone_api_key and pinecone_environment and pinecone_index_name:
        try:
            # Initialize the Pinecone client
            pc = PineconeClient(api_key=pinecone_api_key)

            # Check if the index exists
            if pinecone_index_name not in pc.list_indexes().names():
                st.sidebar.warning(f"Index '{pinecone_index_name}' not found. It will be created upon vectorization.")
            else:
                 st.sidebar.success(f"Pinecone initialized. Index '{pinecone_index_name}' found.")
            return True
        except Exception as e:
            st.sidebar.error(f"Pinecone connection failed: {e}")
            return False
    return False

# --- Core Functions ---

def read_and_chunk_pdfs(uploaded_files):
    """
    Reads uploaded PDF files, extracts text, and splits it into chunks.
    """
    all_docs = []
    with st.spinner('Reading and chunking PDFs...'):
        for uploaded_file in uploaded_files:
            try:
                # Use a temporary file to handle the uploaded PDF
                with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmpfile:
                    tmpfile.write(uploaded_file.getvalue())
                    tmpfile_path = tmpfile.name

                loader = PyPDFLoader(tmpfile_path)
                documents = loader.load()

                # Chunk the data
                text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
                chunked_docs = text_splitter.split_documents(documents)
                all_docs.extend(chunked_docs)

                os.remove(tmpfile_path) # Clean up the temporary file
            except Exception as e:
                st.error(f"Error processing {uploaded_file.name}: {e}")
    return all_docs

def create_vector_store(docs, index_name):
    """
    Creates embeddings and stores them in a Pinecone index using Gemini.
    """
    if not google_api_key:
        st.error("Google API Key is missing. Please provide it in the sidebar.")
        return None

    with st.spinner(f"Creating Gemini embeddings and storing in Pinecone index '{index_name}'..."):
        try:
            embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
            # This will create embeddings and upload them to the index.
            # If the index does not exist, LangChain's Pinecone integration will create it.
            index = Pinecone.from_documents(docs, embeddings, index_name=index_name)
            st.success("Documents have been successfully vectorized and stored in Pinecone.")
            return index
        except Exception as e:
            st.error(f"Failed to create vector store: {e}")
            return None

def retrieve_answers(query, index_name):
    """
    Retrieves answers from the vector store using Gemini.
    """
    if not all([google_api_key, pinecone_api_key, pinecone_environment]):
        st.error("API keys or Pinecone environment not set. Please configure them in the sidebar.")
        return None, None

    with st.spinner("Searching for answers with Gemini..."):
        try:
            embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
            # Connect to the existing index
            index = Pinecone.from_existing_index(index_name, embeddings)

            # Perform similarity search
            doc_search = index.similarity_search(query, k=3) # Retrieve top 3 relevant chunks

            # Get the answer from the LLM
            llm = ChatGoogleGenerativeAI(model="gemini-pro", temperature=0.6, convert_system_message_to_human=True)
            chain = load_qa_chain(llm, chain_type="stuff")
            response = chain.run(input_documents=doc_search, question=query)
            return response, doc_search
        except Exception as e:
            st.error(f"Failed to retrieve answers: {e}")
            return None, None

# --- Streamlit App Logic ---

# 1. File Upload Section
st.header("1. Upload Your Documents")
uploaded_files = st.file_uploader(
    "Upload one or more PDF files",
    type="pdf",
    accept_multiple_files=True
)

# 2. Processing and Vectorization
if uploaded_files:
    if st.button("Process and Vectorize PDFs"):
        if not all([google_api_key, pinecone_api_key, pinecone_environment, pinecone_index_name]):
            st.warning("Please provide all API keys and Pinecone details in the sidebar before processing.")
        else:
            if setup_pinecone():
                # Read and chunk the documents
                documents = read_and_chunk_pdfs(uploaded_files)
                if documents:
                    st.write(f"Total chunks created: {len(documents)}")
                    # Create and store vectors in Pinecone
                    create_vector_store(documents, pinecone_index_name)

# 3. Q&A Section
st.header("2. Ask a Question")
query = st.text_input("Enter your question based on the uploaded documents:")

if query:
    if not pinecone_index_name:
        st.warning("Please provide the Pinecone Index Name in the sidebar.")
    else:
        if setup_pinecone():
            answer, relevant_docs = retrieve_answers(query, pinecone_index_name)
            if answer and relevant_docs is not None:
                st.subheader("Answer:")
                st.write(answer)

                with st.expander("Show Relevant Document Chunks"):
                    for i, doc in enumerate(relevant_docs):
                        st.markdown(f"**Chunk {i+1} (from: {os.path.basename(doc.metadata.get('source', 'N/A'))})**")
                        st.info(doc.page_content)

st.sidebar.markdown("---")
st.sidebar.info("This app uses Google Gemini and Pinecone to allow natural language queries on your PDF documents.")