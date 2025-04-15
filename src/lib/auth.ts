import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // In a real app, we would fetch this from an API route that uses bcrypt safely
        // For demo purposes, we'll just hardcode some user data
        const demoUsers = [
          {
            id: "1",
            email: "jamesquags@gmail.com",
            name: "James Quaglia",
            role: "ADMIN"
          },
          {
            id: "2",
            email: "captain@gulllakegolf.com",
            name: "Dan Quaglia",
            role: "TEAM_CAPTAIN"
          },
          {
            id: "3",
            email: "player@gulllakegolf.com",
            name: "Gary Gross",
            role: "PLAYER"
          }
        ];

        const user = demoUsers.find(u => u.email === credentials.email);

        if (!user) {
          return null;
        }

        // Simplified check - always allow password123 for demo
        const isPasswordValid = credentials.password === 'password123';

        if (!isPasswordValid) {
          return null;
        }

        return user;
      },
    }),
  ],
  callbacks: {
    async session({ session, token }: { session: any; token: any }) {
      if (token) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.role = token.role;
      }
      return session;
    },
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
      }
      return token;
    },
  },
};

// Create a reusable auth function
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authOptions,
  session: {
    strategy: "jwt" as const,
  },
});

// Helper functions to check user roles
export function isAdmin(session: any) {
  return session?.user?.role === 'ADMIN';
}

export function isTeamCaptain(session: any) {
  return session?.user?.role === 'TEAM_CAPTAIN';
}

export function isPlayer(session: any) {
  return session?.user?.role === 'PLAYER';
}