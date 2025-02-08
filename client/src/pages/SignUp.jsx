import { SignUp, useUser } from "@clerk/clerk-react";

const SignUpPage = () => {
  const { user } = useUser();

  return (
    <div className="flex justify-center items-center h-screen">
        <SignUp forceRedirectUrl="/onboarding" />
    </div>
  )
}

export default SignUpPage