export function buildPeoplePayload(state = {}, users = []) {
  const normalizedState = state ?? {};
  const people = [];
  const seen = new Set();

  users.forEach((user) => {
    const personState = normalizedState[user.personId] ?? { count: 0, applications: [] };
    seen.add(user.personId);
    people.push({
      id: user.personId,
      ownerUserId: user.id,
      displayName: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username,
      username: user.username,
      count: personState.count ?? 0,
      applications: Array.isArray(personState.applications) ? personState.applications : [],
    });
  });

  Object.entries(normalizedState).forEach(([personId, person]) => {
    if (seen.has(personId)) return;
    people.push({
      id: personId,
      ownerUserId: null,
      displayName: personId,
      username: personId,
      count: person.count ?? 0,
      applications: Array.isArray(person.applications) ? person.applications : [],
    });
  });

  const teamTotal = people.reduce((sum, person) => sum + (person.count ?? 0), 0);
  return { people, teamTotal };
}
