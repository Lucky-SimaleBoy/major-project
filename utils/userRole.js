function shouldBeAdmin(email, registerAsHost) {
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const userEmail = (email || "").trim().toLowerCase();
  if (adminEmail && userEmail === adminEmail) {
    return true;
  }
  return registerAsHost === "on" || registerAsHost === true || registerAsHost === "admin";
}

async function applyAdminRoleIfNeeded(user, email, registerAsHost) {
  if (!user) return user;
  if (shouldBeAdmin(email, registerAsHost)) {
    user.role = "admin";
    await user.save();
  }
  return user;
}

module.exports = { shouldBeAdmin, applyAdminRoleIfNeeded };
