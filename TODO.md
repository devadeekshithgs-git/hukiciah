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

## 🔄 In Progress / To Be Tested

### 1. Notifications
- [x] Daily appointment reminder edge function (needs production testing)
- [ ] Verify email delivery for appointment reminders

### 2. Calendar UI (Future Enhancement)
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

---
Last Updated: 2025-10-20
