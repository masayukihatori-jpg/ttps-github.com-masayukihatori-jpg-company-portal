import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // DBからroleを取得してセッションに追加
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, department: true, position: true },
        });
        if (dbUser) {
          (session.user as any).role = dbUser.role;
          (session.user as any).department = dbUser.department;
          (session.user as any).position = dbUser.position;
        }
      }
      return session;
    },
  },
});
