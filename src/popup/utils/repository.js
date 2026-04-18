export const getRepoNameFromFullName = (fullName) => {
  if (!fullName) {
    return "";
  }

  const parts = fullName.split("/");
  return parts[parts.length - 1] || fullName;
};
