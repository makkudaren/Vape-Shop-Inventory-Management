STEPS TO RUN THE CODE


1. Install dependencies
    pip install -r requirements.txt

2. Fill in your .env
Open backend/.env and set your real values:
    GMAIL_ADDRESS=your-gmail@gmail.com
    GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx   ← 16-char app password from Google
    SECRET_KEY=any-long-random-string-here
To get a Gmail App Password: Google Account → Security → 2-Step Verification → App passwords → create one for "Mail".

3. Reinstall different versions of dependencies
    pip uninstall bcrypt -y
    pip install bcrypt==4.0.1
    pip install --upgrade passlib


4. Run the server
    cd backend
    uvicorn main:app --reload

