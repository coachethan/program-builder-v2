import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Scope is deliberately narrow: drive.file only grants access to files THIS app creates, never
// the user's existing Drive contents. access_type=offline + prompt=consent ensure Google actually
// returns an access token we can use immediately after sign-in (some browsers/accounts skip
// returning one on repeat sign-ins without this).
//
// This lives in its own file (not inside app/api/auth/[...nextauth]/route.ts) because Next.js's
// route handler files may ONLY export GET/POST/etc - exporting authOptions directly from route.ts
// fails Next.js's route type-checking ("not a valid Route export field").
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/drive.file",
          access_type: "offline",
          prompt: "consent"
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    }
  }
};
