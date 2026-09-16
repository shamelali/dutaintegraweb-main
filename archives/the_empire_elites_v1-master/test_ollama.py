from crewai import LLM

# Test Ollama via LiteLLM
llm = LLM(
    model="ollama/qwen2.5-coder:7b",
    base_url="http://localhost:11434"
)

print(f"Testing Ollama...")
try:
    response = llm.call("Say 'Ollama works' in 3 words")
    print(f"✓ Response: {response}")
except Exception as e:
    print(f"✗ Error: {e}")
