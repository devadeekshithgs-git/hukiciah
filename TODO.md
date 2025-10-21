# HUKI App Implementation TODO

## ✅ Completed
- [x] Database schema updates (cancellation_credits, blocked_trays, notification_logs)
- [x] Cancellation policy implementation
- [x] Post-payment delivery method dialog
- [x] Daily appointment notifications edge function
- [x] Credit system in profile
- [x] Payment-optional mode support
- [x] Remove root directory page - /auth is now the default route
- [x] Default to Sign Up screen for first-time visitors
- [x] Add separate Sign In and Sign Up buttons (not just text link)
- [x] Remove prefilled values in auth screen
- [x] Change "Good night" to "Good evening" in dateUtils
- [x] Add manual tray selection option alongside auto-allocation
- [x] Move packet number input to DishSelection screen
- [x] Remove packet input from PackingCosts screen
- [x] Fix booking date display format in Profile
- [x] Add order tracking/progress feature
- [x] Add "View Details" expandable section in bookings
- [x] Ensure "Cancel Order" button is visible with proper rules
- [x] Add booking details dialog with full information
- [x] **Admin Dashboard System**
  - Role-based authentication (admin/customer roles)
  - Admin dashboard with three tabs (Dashboard, Bookings, Calendar)
  - View all bookings with customer details
  - Calendar configuration management
  - Holiday marking and date notices
  - Blocked tray management
  - Auto-redirect based on user role after login

## 🔄 In Progress / To Be Tested

### 1. Admin Role Assignment
- [ ] **IMPORTANT**: Manually assign admin role to your user account
- Use this SQL in the backend database:
```sql
INSERT INTO user_roles (user_id, role) 
VALUES ('your-user-id-here', 'admin');
```
- Replace 'your-user-id-here' with your actual user ID from auth.users table

### 2. Customer App Integration with Admin Calendar
- [ ] Fetch calendar_config data before showing booking dates
- [ ] Block holiday dates from selection
- [ ] Display admin notices for dates
- [ ] Respect blocked trays when allocating/selecting trays

### 3. Notifications
- [x] Daily appointment reminder edge function (needs production testing)
- [ ] Verify email delivery for appointment reminders

### 4. Calendar UI (Future Enhancement)
- [ ] Show notifications as color-conditional formatted dates in calendar
- [ ] Replace side pop-up messages with full-screen notification dialogs

## 📋 Additional Features Requested
- [ ] Enhanced booking edit functionality (currently view-only)
- [ ] Full-screen notification system for calendar with color coding

## 📝 Notes
- All core features have been implemented
- Auth flow now starts with Sign Up screen by default
- Manual tray selection available alongside automatic allocation
- Packet selection moved to first step (Dish Selection)
- Profile page shows comprehensive booking information with expand/collapse
- Order progress tracking shows status (Confirmed/Awaiting Processing/Completed)
- Cancellation with 50% credit working as expected
- Daily reminder emails scheduled (edge function created)
- **Admin Dashboard**: Same login system, role-based redirect (admin → /admin, customer → /welcome)
- **Next Step**: Assign admin role to your account to access the admin dashboard

## 🔐 How to Access Admin Dashboard
1. Sign up/login normally with your account
2. Run this SQL in your backend to make yourself an admin:
```sql
INSERT INTO user_roles (user_id, role) 
VALUES ('your-user-id-from-auth-users', 'admin');
```
3. Log out and log back in
4. You'll be automatically redirected to /admin

---
Last Updated: 2025-10-21
