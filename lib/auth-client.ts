import {createAuthClient} from "better-auth/react";

const authClient = createAuthClient();
export const signInWithGoogle = async()=>{
    await authClient.signIn.social({
        provider: "google",
        callbackURL: "/domain",
        newUserCallbackURL:"/dashboard"
    });
}

// email/password export the whole authclient methods directly
export const {signOut , useSession} = authClient;
export const signIn = authClient.signIn;
export const signUp = authClient.signUp;
