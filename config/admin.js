// Add admin UIDs here
// To find your UID: log in, then check Firebase Console > Authentication > Users
export const ADMIN_UIDS = ['PASTE_YOUR_UID_HERE'];

export const isAdmin = (uid) => ADMIN_UIDS.includes(uid);
