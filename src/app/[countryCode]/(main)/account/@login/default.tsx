import LoginTemplate from "@modules/account/templates/login-template"

/**
 * Next 16 requires every parallel slot to have a default (#2636).
 *
 * The login slot only has a page at /account, so on a hard load of
 * /account/orders (or /account/profile, /account/addresses) a signed-out
 * visitor had no matching login view. Show the sign-in form there too.
 */
export default function LoginDefault() {
  return <LoginTemplate />
}
