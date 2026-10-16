# The Reach Universe - agent guidance

This fork contains both the original interactive Universe explorer and the
autonomous Reach presentation used by the Windows screensaver. Read the
relevant code and README.md before editing. Preserve explorer behavior when
changing shared code unless the task explicitly calls for a shared change.

Keep changes focused and maintainable. Inspect Git status first, preserve
unrelated work, and make sensible decisions within the requested scope.
Use existing utilities where they fit; justify a different approach when it
improves the result. Investigate problems, challenge weak approaches, and
make routine decisions within the approved scope without unnecessary
permission requests.

Reach's route, camera, and saved journey are connected contracts. For changes
to contracts shared with Screensaver, check both repositories, including
itinerary order, checkpoint shape, migration, and reset behavior when
relevant. If Screensaver is unavailable, report that limitation rather than
claiming compatibility. Validate restoration of existing journeys. Keep
development previews isolated from production journey state. For panorama
changes, preserve one authoritative camera pose across displays and check
both single-monitor and multi-monitor presentation.

Use astronomical sources and procedural approximations accurately. Check
provenance, attribution, offline behavior, and rendering cost when changing
data, imagery, assets, or visual effects. Refer to NOTICE.md and the relevant
source or validation reports for details.

Run relevant focused scripts and typecheck for affected code; use broader
builds or suites when the change warrants them. Inspect the application in a
browser when visual appearance is an acceptance criterion. Automated checks
do not establish owner visual acceptance.

Only the human owner may write to a remote. Agents must never run `git push`,
`git push --tags`, remote merges, `gh release create` or upload, cloud deployment
commands, or any other remote-write action, even if a later request casually
asks to publish. Agents may prepare local commits and checked commands for the
owner to execute manually. This rule has no implied exceptions.

Do not reset owner journey data without explicit authorization.

Report changed files, executed validation and results, remaining risks, and
unverified assumptions. Distinguish observed behavior from code findings
and inference. README.md, NOTICE.md, and the relevant Docs/Reports files
provide details; do not duplicate them here.
