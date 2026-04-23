import requests

url = "http://127.0.0.1:8000/whatsapp-hook"

data1 = {"From": "whatsapp:+1234567890", "Body": "1"}
res1 = requests.post(url, data=data1)
print(f"State 1 status: {res1.status_code}")
print(f"State 1 text: {res1.text}")

data2 = {"From": "whatsapp:+1234567890", "Body": "EU approves 90bn loan for Ukraine"}
res2 = requests.post(url, data=data2)
print(f"State 2 status: {res2.status_code}")
print(f"State 2 text: {res2.text}")
