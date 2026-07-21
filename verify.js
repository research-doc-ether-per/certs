const addIssueTarget = (
  response,
  issueTarget
) => ({
  ...response,
  data: {
    ...response?.data,
    issueTarget,
  },
})

response = addIssueTarget(
  response,
  issueTargets.organization
)
