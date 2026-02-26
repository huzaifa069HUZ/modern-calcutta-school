# Donation Page Implementation Plan

## Goal
Create a modern, clean, and emotionally convincing donation page (`donate.html`) with a notice bar, image slider, impact statistics, a donation form with receipt, and admin dashboard integration.

## Project Type
WEB

## Tech Stack
- HTML5, Tailwind CSS
- Swiper.js (for the hero slider)
- Firebase Firestore (for saving donation records)
- Custom CSS for marquee animation and premium design elements

## Tasks
- [ ] Task 1: File Setup & Global Header
  - **Action**: Create `donate.html` with standard HTML structure. Add the phone number to the header (and update `index.html` header if necessary so the phone number is showcased consistently).
  - **Verify**: File opens, phone number is prominently displayed in the header.
- [ ] Task 2: Notice Bar & Hero Banner Slider
  - **Action**: Add a sticky notice bar with a yellow border and right-to-left scrolling text ("donate now so a child can be educated with your money"). Implement a full-width Swiper.js hero slider with 4 images, dark overlay, and a prominent DONATION PAGE title.
  - **Verify**: Notice bar scrolls smoothly; slider transitions between images properly.
- [ ] Task 3: Impact Stats & Community Support Sections
  - **Action**: Build sections showing "students educated" and "people helped", alongside content explaining MCS's donation reach to the poor and needy.
  - **Verify**: Sections are visually engaging and responsive.
- [ ] Task 4: Donation Form & Razorpay Placeholder
  - **Action**: Create a donation form capturing Name, Phone, Email, Address, and Donation Amount. Include a disabled/placeholder "Pay with Razorpay" button and a default submit mechanism for testing.
  - **Verify**: Form validates required fields properly.
- [ ] Task 5: Backend Integration & Receipt Generation
  - **Action**: Connect the form to Firebase Firestore to compile and save donation details into a new `donations` collection. Upon successful save, display a beautifully designed modal or downloadable receipt with the donation details.
  - **Verify**: Submitting the form writes a document to Firestore and shows the receipt to the user.
- [ ] Task 6: Admin Dashboard Donations View
  - **Action**: Create a new `admin/donations.html` view (or integrate into `admin/dashboard.html`) that fetches and displays records from the `donations` Firestore collection.
  - **Verify**: Admin can view donator name, details, and amount clearly in a table format.

## Done When
- [ ] `donate.html` is fully functional with the scrolling notice bar, hero slider, and impact sections.
- [ ] Users can fill out the donation form and receive a digital receipt.
- [ ] Donation records are successfully saved to Firestore.
- [ ] The admin panel correctly displays these donation records.
- [ ] The phone number is visible on the header.

## Phase X: Verification
- [ ] Run `python .agent/skills/frontend-design/scripts/ux_audit.py .`
- [ ] Test the form submission end-to-end to verify Firestore write and receipt popup.
