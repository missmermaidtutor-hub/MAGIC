// Add admin UIDs here
// To find your UID: log in, then check Firebase Console > Authentication > Users
export const ADMIN_UIDS = ['VYnCl7waz4VyxRhryIAOTA9NBMg2'];

export const isAdmin = (uid) => ADMIN_UIDS.includes(uid);
