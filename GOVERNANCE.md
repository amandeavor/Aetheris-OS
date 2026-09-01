# Governance

Aetheris OS uses a lightweight maintainer model while the project is young. Authority follows demonstrated responsibility for code and community, not raw commit counts.

## Roles

### Contributor

Anyone who improves code, tests, documentation, design, issue investigation, or community support.

### Reviewer

A regular contributor trusted to triage issues and review changes in a documented area. Reviewers do not merge their own work solely on that basis.

### Component maintainer

A contributor responsible for the health of one component or subsystem. Maintainers review changes, keep its backlog current, document releases and breaking changes, and respond to security reports affecting their area.

### Project lead

The project lead coordinates cross-component direction, repository access, releases, and final decisions when maintainers cannot reach consensus.

## Current maintainers

| Area | Maintainer |
| --- | --- |
| Project coordination and repository administration | [@amandeavor](https://github.com/amandeavor) |

Additional component owners will be listed only after they accept the responsibility and have relevant reviewed work in the repository.

## Maintainer path

A contributor may be nominated by an existing maintainer or nominate themselves in a public Discussion. A strong nomination normally shows:

- several meaningful merged contributions in the proposed area;
- helpful reviews or issue triage, not only authored code;
- sustained participation over time;
- sound judgment around compatibility, security, and user impact;
- consistent adherence to the Code of Conduct.

There is no automatic threshold. For a young project, the quality of decisions matters more than a fixed number of weeks or pull requests. The project lead records the decision publicly and grants the minimum access needed for the role.

Maintainer access may be reduced after prolonged inactivity, repeated unsafe changes, or Code of Conduct violations. Whenever practical, this is discussed privately first and recorded transparently when it changes public ownership.

## Decisions

Routine changes use pull-request consensus. Substantial architecture, compatibility, security, or governance changes begin as a Discussion or design document. Maintainers should document the alternatives considered and aim for rough consensus. The project lead makes the final call only when a decision is blocked.

## Releases

There are currently no stable releases. A future release must identify its maturity, supported installation path, known destructive operations, verification steps, and rollback expectations. No component should be described as stable solely because it compiles.
