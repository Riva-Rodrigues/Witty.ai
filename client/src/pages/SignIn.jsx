import { SignIn } from "@clerk/clerk-react";

const SignInPage = () => {
  return (
    <div className="flex justify-center items-center h-screen">
        <SignIn forceRedirectUrl="/dashboard" />
    </div>
  )
}

export default SignInPage