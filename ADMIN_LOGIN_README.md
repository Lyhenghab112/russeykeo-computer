# 🔐 Admin Login System

This document describes the new secure admin login system for Russeykeo Computer's administrative interface.

## 🌐 Access URL

**Admin Login**: `/admin` (e.g., `http://127.0.0.1:5000/admin`)

## 🔒 Security Features

- **Exclusive Access**: Only accessible via `/admin` route
- **Role-Based Access**: Restricted to staff, admin, and super_admin roles
- **Rate Limiting**: Maximum 5 failed login attempts before temporary lockout
- **Session Management**: Secure session handling with automatic logout
- **Password Hashing**: All passwords are securely hashed using Werkzeug
- **Access Logging**: All login attempts are logged for security monitoring
- **Customer Login Separation**: Staff/admin users are automatically redirected to admin portal
- **Regular Login Protection**: Customer login page prevents staff/admin access

## 👥 Supported User Roles

The following roles can access the admin system:

- **super_admin** - Full system access
- **admin** - Administrative access
- **manager** - Management-level access
- **staff** - General staff access
- **sales** - Sales staff access
- **clerk** - Clerical staff access
- **cashier** - Cashier access

## 🚀 Getting Started

### 1. Update Existing User Passwords

The existing users in the database have plain text passwords that need to be updated. Run the password update script:

```bash
python update_admin_passwords.py
```

This will:
- Update all existing users with properly hashed passwords
- Set a default password: `admin123`
- Display all updated users and their roles

### 2. Test the Admin Login

1. Navigate to `/admin` in your browser
2. Use any of the existing usernames:
   - `lyhenghab` (SUPER_ADMIN)
   - `heng` (ADMIN)
   - `hab` (ADMIN)
   - `dalin` (STAFF)
   - `vidtou` (STAFF)
   - `kimla` (STAFF)
3. Use the default password: `admin123`

### 3. Access Staff Dashboard

After successful login, you'll be redirected to the staff dashboard where you can:
- Manage users
- View inventory
- Process orders
- Generate reports
- And more...

## 🛡️ Security Best Practices

### For Production Use

1. **Change Default Passwords**: Immediately change the default `admin123` password
2. **Use Strong Passwords**: Implement password complexity requirements
3. **Enable HTTPS**: Always use HTTPS in production
4. **Regular Updates**: Keep the system and dependencies updated
5. **Monitor Logs**: Regularly review login and access logs
6. **Session Timeout**: Consider implementing automatic session timeouts
7. **Security Through Obscurity**: Don't reveal internal system structure
8. **Generic Error Messages**: Use consistent error messages for all failed login attempts

### Password Requirements

- Minimum 8 characters
- Mix of uppercase, lowercase, numbers, and symbols
- Avoid common patterns and dictionary words

## 🔧 Technical Implementation

### Routes

- `GET /admin` - Admin login page
- `POST /admin/login` - Process admin login
- `GET /admin/logout` - Admin logout

### Login Separation

- **Customer Login** (`/login`): Only for regular customers
- **Admin Login** (`/admin`): Only for staff and administrators
- **Automatic Redirect**: Staff users attempting to use customer login are silently redirected to admin portal
- **Security Through Obscurity**: No indication of admin portal existence on customer login page

### Authentication Flow

1. User visits `/admin`
2. System checks if user is already logged in
3. If logged in, redirects to appropriate dashboard
4. If not logged in, shows login form
5. User submits credentials
6. System validates username, password, and role
7. On success, creates session and redirects to dashboard
8. On failure, increments failed attempt counter

### Session Management

- Session data includes: `user_id`, `username`, `role`, `full_name`
- Sessions are cleared on logout
- Failed login attempts are tracked in session

## 🚨 Troubleshooting

### Common Issues

1. **"Access denied. Insufficient privileges"**
   - User role is not in the allowed list
   - Check user's role in the database

2. **"Account is deactivated"**
   - User account has `is_active = false`
   - Contact system administrator

3. **"Too many failed login attempts"**
   - Wait for session to reset or clear browser cookies
   - This is a security feature to prevent brute force attacks

4. **"Cannot read properties of undefined"**
   - Check if the User model is properly imported
   - Verify database connection

### Debug Mode

Enable debug logging in your Flask app to see detailed error messages:

```python
app.debug = True
```

## 📝 API Endpoints

The admin system integrates with existing staff API endpoints:

- User management: `/auth/api/staff/users/*`
- Inventory management: `/auth/staff/inventory`
- Order management: `/auth/staff/orders`
- Customer management: `/auth/staff/customers`

## 🔄 Updates and Maintenance

### Adding New Users

Use the existing user management interface or create users directly in the database:

```sql
INSERT INTO users (username, password, role, email, full_name, is_active) 
VALUES ('newuser', 'hashed_password', 'staff', 'user@example.com', 'New User', 1);
```

### Modifying User Roles

Update user roles through the user management interface or directly:

```sql
UPDATE users SET role = 'admin' WHERE username = 'username';
```

## 📞 Support

For technical support or questions about the admin system:

1. Check the application logs for error details
2. Verify database connectivity and user permissions
3. Ensure all required dependencies are installed
4. Contact the development team for complex issues

---

**⚠️ Security Notice**: This system provides administrative access to sensitive business data. Always follow security best practices and never share credentials or access information.
