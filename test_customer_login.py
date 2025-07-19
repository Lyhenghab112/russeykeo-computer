import requests
import sys

def test_customer_login():
    base_url = "http://localhost:5000"
    
    # Create a session to maintain cookies
    session = requests.Session()
    
    try:
        # First, get the login page to establish session
        print("1. Getting login page...")
        login_page = session.get(f"{base_url}/auth/login")
        print(f"Login page status: {login_page.status_code}")
        
        # Attempt to login with test customer credentials
        print("2. Attempting customer login...")
        login_data = {
            'username': 'test@customer.com',
            'password': 'password123'
        }
        
        login_response = session.post(f"{base_url}/auth/login", data=login_data, allow_redirects=False)
        print(f"Login response status: {login_response.status_code}")
        print(f"Login response headers: {dict(login_response.headers)}")
        
        if login_response.status_code == 302:
            redirect_location = login_response.headers.get('Location', '')
            print(f"Redirected to: {redirect_location}")
            
            # Follow the redirect
            if redirect_location:
                if redirect_location.startswith('/'):
                    redirect_url = base_url + redirect_location
                else:
                    redirect_url = redirect_location
                    
                print("3. Following redirect...")
                dashboard_response = session.get(redirect_url)
                print(f"Dashboard response status: {dashboard_response.status_code}")
                
                # Now try to access the pre-orders page
                print("4. Accessing pre-orders page...")
                preorders_response = session.get(f"{base_url}/customer/preorders")
                print(f"Pre-orders response status: {preorders_response.status_code}")
                
                if preorders_response.status_code == 200:
                    print("✅ SUCCESS: Customer can access pre-orders page!")
                    # Check if the page contains expected content
                    if "pre-order" in preorders_response.text.lower():
                        print("✅ Page contains pre-order content")
                    else:
                        print("⚠️  Page doesn't contain expected pre-order content")
                elif preorders_response.status_code == 302:
                    redirect_location = preorders_response.headers.get('Location', '')
                    print(f"❌ Pre-orders page redirected to: {redirect_location}")
                else:
                    print(f"❌ Pre-orders page returned status: {preorders_response.status_code}")
                    
        else:
            print(f"❌ Login failed with status: {login_response.status_code}")
            print(f"Response content: {login_response.text[:500]}")
            
    except Exception as e:
        print(f"❌ Error during test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_customer_login()
