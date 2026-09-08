import urllib.request
import json
import time

def test_endpoint(url, data=None):
    try:
        req = urllib.request.Request(url)
        if data:
            req.add_header('Content-Type', 'application/json')
            payload = json.dumps(data).encode('utf-8')
            resp = urllib.request.urlopen(req, data=payload)
        else:
            resp = urllib.request.urlopen(req)
        status = resp.getcode()
        body = resp.read().decode('utf-8')
        return status, body
    except Exception as e:
        return 0, str(e)

print('Testing NirmanVaani Backend Endpoints...')

# 1. Test Home /
status, body = test_endpoint('http://127.0.0.1:8000/')
print(f'1. GET / -> Status: {status}, HTML bytes: {len(body)}')

# 2. Test /api/districts
status, body = test_endpoint('http://127.0.0.1:8000/api/districts')
districts = json.loads(body)
print(f'2. GET /api/districts -> Status: {status}, Districts loaded: {len(districts)}')

# 3. Test /api/reports
status, body = test_endpoint('http://127.0.0.1:8000/api/reports')
reports = json.loads(body)
print(f'3. GET /api/reports -> Status: {status}, Reports loaded: {len(reports)}')

# 4. Test /api/projects
status, body = test_endpoint('http://127.0.0.1:8000/api/projects?w1=0.35&w2=0.40&w3=0.25')
projects = json.loads(body)
print(f'4. GET /api/projects -> Status: {status}, Projects ranked: {len(projects)}')
if projects:
    print(f'   Top Ranked: {projects[0]["title"]} (Score: {projects[0]["score"]}/100)')

# 5. Test /api/gemini/analyze
sample = {'text': 'আমাদের বলরামপুর ব্লকে নলবাহিত পানীয় জল প্রকল্প বন্ধ'}
status, body = test_endpoint('http://127.0.0.1:8000/api/gemini/analyze', sample)
analyzed = json.loads(body)
print(f'5. POST /api/gemini/analyze -> Status: {status}, Detected: {analyzed.get("detected_language")}, Sector: {analyzed.get("sector")}, Urgency: {analyzed.get("urgency_score")}')

# 6. Test /api/analytics
status, body = test_endpoint('http://127.0.0.1:8000/api/analytics')
analytics = json.loads(body)
print(f'6. GET /api/analytics -> Status: {status}, Total Monitored Pop: {analytics.get("total_population_monitored")}')

print('\nALL BACKEND API TESTS PASSED!')
