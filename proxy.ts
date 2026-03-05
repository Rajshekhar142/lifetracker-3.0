import {NextRequest, NextResponse} from "next/server"
import {headers} from "next/headers";
import {auth} from "@/lib/auth";

export async function proxy(request: NextRequest){
    const session = await auth.api.getSession({
        headers: await headers()
    })


    // this ain't secure
    // this is recommended approach to optimistically redirect users
    // we recommend handling auth checks in each page/route
    if(!session){
        return NextResponse.redirect(new URL("/sign-in", request.url));
    }
    return NextResponse.next();
}
export const config = {
    matcher: ["/dashboard"],
}