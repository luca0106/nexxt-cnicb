import os
import json
import urllib.request
import urllib.error
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(env_path)

api_key = os.getenv("AWS_API_KEY", "").strip()
print(f"[*] Found AWS_API_KEY: {api_key[:10]}... (length: {len(api_key)})")

models_to_test = [
    # Amazon Nova
    ("us-east-1", "amazon.nova-micro-v1:0"),
    ("us-east-1", "amazon.nova-lite-v1:0"),
    ("us-east-1", "amazon.nova-pro-v1:0"),
    ("eu-central-1", "amazon.nova-lite-v1:0"),
    # Anthropic Claude 3.5 & 3.7
    ("us-east-1", "us.anthropic.claude-3-7-sonnet-20250219-v1:0"),
    ("us-east-1", "us.anthropic.claude-3-5-haiku-20241022-v1:0"),
    ("us-east-1", "anthropic.claude-3-5-sonnet-20241022-v2:0"),
    ("eu-central-1", "eu.anthropic.claude-3-5-sonnet-20241022-v2:0"),
    ("eu-west-1", "eu.anthropic.claude-3-5-sonnet-20241022-v2:0"),
    # Meta Llama
    ("us-east-1", "meta.llama3-3-70b-instruct-v1:0"),
    ("us-east-1", "meta.llama3-2-3b-instruct-v1:0"),
    ("us-east-1", "us.meta.llama3-2-3b-instruct-v1:0"),
    # Amazon Titan
    ("us-east-1", "amazon.titan-text-express-v1"),
    ("eu-central-1", "amazon.titan-text-express-v1"),
]

success = False
for region, model in models_to_test:
    url = f"https://bedrock-runtime.{region}.amazonaws.com/model/{model}/converse"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    payload = {
        "messages": [
            {
                "role": "user",
                "content": [{"text": "Hello, confirm in one sentence that you are online."}]
            }
        ],
        "inferenceConfig": {
            "maxTokens": 50,
            "temperature": 0.1
        }
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=7) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            out_text = data.get("output", {}).get("message", {}).get("content", [{}])[0].get("text", "")
            print(f"\n[+++] SUCCESS ON REGION {region} WITH MODEL {model}!")
            print(f"[+] Response: {out_text.strip()}")
            print(f"\nRecommended .env setting:")
            print(f"AWS_API_URL={url}")
            print(f"AWS_MODEL_ID={model}")
            success = True
            break
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8", errors="ignore")
        if "end of its life" not in err_msg:
            print(f"[-] {region} / {model} -> HTTP {e.code}: {err_msg[:120]}")
    except Exception as e:
        pass

if not success:
    print("\n[-] Tested standard models. Trying invoke-model endpoint format...")
