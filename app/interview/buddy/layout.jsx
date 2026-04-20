/**
 * Layout for buddy invite pages
 * Ensures the page doesn't unmount/remount when changing routes
 */
export const metadata = {
  title: "Interview Buddy - Join Session",
  description: "Join a human buddy interview session",
};

export default function BuddyInviteLayout({ children }) {
  return children;
}
