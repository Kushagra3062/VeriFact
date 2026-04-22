import requests
url = "http://localhost:8000/whatsapp-hook"
data = {"From": "whatsapp:+1234567890", "Body": "1"}
print("State 1:", requests.post(url, data=data).text)

data = {"From": "whatsapp:+1234567890", "Body": "EU approves 90bn loan for Ukraine"}
print("State 2:", requests.post(url, data=data).text)
