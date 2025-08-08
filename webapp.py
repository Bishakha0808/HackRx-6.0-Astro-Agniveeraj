import streamlit as st
import pinecone
from langchain.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.vectorstores import Pinecone
from langchain.llms import OpenAI
from langchain.chains.question_answering import load_qa_chain
import os
import tempfile

# --- UI Configuration ---
st.set_page_config(page_title="PDF Query with LLMs", layout="wide")
st.title("📄 PDF Query System with LLMs and Pinecone")
st.markdown("""
<style>
    .stApp {
        background-color: #f0f2f6;
    }
    .stButton>button {
        background-color: #4CAF50;
        color: white;
        border-radius: 12px;
        padding: 10px 24px;
        border: none;
        font-size: 16px;
    }
    .stTextInput>div>div>input {
        border-radius: 10px;
        border: 2px solid #4CAF50;
    }
</style>
""", unsafe_allow_html=True)


# --- API Key and Environment Setup ---
with st.sidebar:
    st.header("🔑 API Configuration")
    openai_api_key = st.text_input("Enter your OpenAI API Key:", type="password")
    pinecone_api_key = st.text_input("Enter your Pinecone API Key:", type="password")
    pinecone_environment = st.text_input("Enter your Pinecone Environment:", placeholder="e.g., gcp-starter")
    pinecone_index_name = st.text_input("Enter your Pinecone Index Name:", placeholder="e.g., langchainvector")

    if openai_api_key:
        os.environ["OPENAI_API_KEY"] = openai_api_key

def setup_pinecone():
    """Initializes Pinecone if keys are provided."""
    if pinecone_api_key and pinecone_environment:
        try:
            pinecone.init(api_key=pinecone_api_key, environment=pinecone_environment)
            st.sidebar.success("Pinecone initialized successfully!")
            return True
        except Exception as e:
            st.sidebar.error(f"Pinecone initialization failed: {e}")
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
    Creates embeddings and stores them in a Pinecone index.
    """
    if not openai_api_key:
        st.error("OpenAI API Key is missing. Please provide it in the sidebar.")
        return None

    with st.spinner(f"Creating embeddings and storing in Pinecone index '{index_name}'..."):
        try:
            embeddings = OpenAIEmbeddings()
            # This will create embeddings and upload them to the index
            index = Pinecone.from_documents(docs, embeddings, index_name=index_name)
            st.success("Documents have been successfully vectorized and stored in Pinecone.")
            return index
        except Exception as e:
            st.error(f"Failed to create vector store: {e}")
            return None

def retrieve_answers(query, index_name):
    """
    Retrieves answers from the vector store based on a user query.
    """
    if not openai_api_key or not pinecone_api_key or not pinecone_environment:
        st.error("API keys or Pinecone environment not set. Please configure them in the sidebar.")
        return None, None

    with st.spinner("Searching for answers..."):
        try:
            embeddings = OpenAIEmbeddings()
            # Connect to the existing index
            index = Pinecone.from_existing_index(index_name, embeddings)

            # Perform similarity search
            doc_search = index.similarity_search(query, k=3) # Retrieve top 3 relevant chunks

            # Get the answer from the LLM
            llm = OpenAI(model_name="gpt-3.5-turbo-instruct", temperature=0.6)
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
        if not all([openai_api_key, pinecone_api_key, pinecone_environment, pinecone_index_name]):
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
            if answer:
                st.subheader("Answer:")
                st.write(answer)

                with st.expander("Show Relevant Document Chunks"):
                    for i, doc in enumerate(relevant_docs):
                        st.markdown(f"**Chunk {i+1} (from: {os.path.basename(doc.metadata.get('source', 'N/A'))})**")
                        st.info(doc.page_content)

st.sidebar.markdown("---")
st.sidebar.info("This app uses OpenAI and Pinecone to allow natural language queries on your PDF documents.")