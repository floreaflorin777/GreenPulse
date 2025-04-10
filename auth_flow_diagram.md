# Greenhouse Management System - Authentication Process

Below is a simplified diagram of how the authentication and user management system works:

```mermaid
graph TD
    %% Starting point
    start([Start]) --> login[Login Page]
    
    %% Login process
    login -- "Enter credentials" --> auth{Check<br>Username & Password}
    auth -- "Invalid credentials" --> login
    auth -- "Valid credentials" --> session[Create User Session]
    
    %% Role-based access
    session --> check{Check User Role}
    check -- "Regular User" --> dashboard[View Dashboard]
    check -- "Admin User" --> admin[Admin Functions]
    
    %% Admin actions
    admin --> view[View Dashboard]
    admin --> manage[Manage Users]
    
    %% User management options
    manage --> add[Add New User]
    manage --> edit[Edit Existing User]
    manage --> delete[Delete User]
    
    %% User operations
    add --> confirm{Validate<br>User Data}
    edit --> confirm
    confirm -- "Valid" --> save[Save to Database]
    confirm -- "Invalid" --> manage
    
    %% Delete protection
    delete --> protect{Last Admin?}
    protect -- "Yes" --> prevent[Prevent Deletion]
    protect -- "No" --> remove[Remove User]
    
    %% Ending points
    dashboard --> logout[Logout]
    view --> logout
    save --> manage
    prevent --> manage
    remove --> manage
    logout --> login
    
    %% Visual styling
    classDef start fill:#9f6,stroke:#333,stroke-width:2px
    classDef page fill:#6cf,stroke:#333,stroke-width:2px
    classDef check fill:#fc9,stroke:#333,stroke-width:2px
    classDef action fill:#9cf,stroke:#333,stroke-width:2px
    classDef error fill:#f96,stroke:#333,stroke-width:2px
    
    class start,logout start
    class login,dashboard,admin,manage page
    class auth,check,confirm,protect check
    class session,add,edit,delete,view,save,remove action
    class prevent error
```

## Simplified Explanation for Non-Technical Users

### User Login Process

1. **Starting Point**: A user visits the greenhouse monitoring system
2. **Login Page**: The system presents a login screen requesting username and password
3. **Credential Check**: The system verifies the entered credentials against the database
   - If the credentials are invalid, the user returns to the login page
   - If the credentials are valid, the system creates a secure session for that user

### Access Based on Role

1. **Role Check**: The system determines what level of access the user should have
   - **Regular Users** can only view the dashboard and monitoring data
   - **Admin Users** can both view data and manage system users

### Admin Capabilities

When logged in as an administrator, the user can:

1. **View the Dashboard**: See all greenhouse environmental data
2. **Manage Users**: Access the user management interface
   - **Add New Users**: Create accounts for additional staff members
   - **Edit Users**: Update information for existing users
   - **Delete Users**: Remove user accounts when no longer needed

### Security Safeguards

The system includes several important security features:

1. **Validation**: All user information is checked for validity before saving
2. **Admin Protection**: The system prevents deletion of the last administrator account
3. **Session Management**: User sessions are securely maintained and can be ended by logging out

### Session Expiration

For additional security:

1. **Automatic Timeout**: If inactive for an extended period, the session expires
2. **Manual Logout**: Users can explicitly log out when finished
3. **One-Device Limit**: Each account can only be logged in from one device at a time

This authentication flow ensures that greenhouse data remains secure while providing appropriate access to authorized personnel based on their responsibilities.
