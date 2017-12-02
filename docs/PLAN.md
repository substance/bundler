# Inbox

## Test-Suite

We should have a test-suite. It would be great
to able to use a virtual file-system.
Then we can debug the tests in the browser.

# Next

## Internal Dependency Graph
<a name="internal-dependency-graph"></a>

ATM the architecture is not very good as it allows
to register multiple file watchers on the same file
while on the other hand it triggers actions in a cascaded
way already. This leads to a situation where actions
are triggered out-of-control.

### Proposal

Approach the problem in the same as with Stencila Cells.
An `action` in Bundler corresponds to a `cell` in Stencila,
and a `file` corresponds to a `variable`.

Files are changed during the evaluation bundling
process, but also can change outside of that via the
file system. It is important that the system can deal
with these two sources of updates. We should take
the Engine implementation from Stencila and apply
it to this problem.

### Implementation

How should scheduling be done?

- create a linear schedule
  which is the correct order of actions
  with respect to their (declared) dependencies
- the schedule is always walked through
  but actions only triggered if one of their inputs
  are dirty
- a step in the current run is only done after an action
  has finished. By then, a file-watcher should have
  received an update marking that file as dirty
- if a file is changed that has already been passed,
  we will invalidate the current run and schedule a
  new cycle. See [1] for discussion


> `[1]` A use case for this is, when the user
  edits a source file and saves while an update
  is already going on.
  The correct procedure would be to invalidate
  the on-going update, and instead start a new cycle.
  Invalidation means, that all actions that knowingly
  depend on the updated file will be skipped in the current
  cycle.

# Log

## Implement [Internal Dependency Graph](#internal-dependency-graph)

This is part of a general substance-bundler overhaul.

## Implement [Better API for Custom Tasks](#better-custom-api)

Need this as part of a general substance-bundler overhaul.
This way it will be easier to use bundler with other tools
and still get the file-watching stuff for free.

## Start Making Plans

Started this document to record ideas.

# Someday

> Ideas which have not been rejected
  but we won't address soon

# Archive

> Ideas that have been implemented or rejected.

## Better API for Custom Tasks
<a name="better-custom-api"></a>

ATM `b.custom()` requires a `src` glob pattern,
and a `execute(files)` method. It registers a watcher
for the input pattern, and calls the `execute` handler
with an array of files.
In some cases this is sufficient, i.e. when the task
is aggregating all input files producing one output.
It does not work well for a custom task that executes
on a file-by-file basis. If one file is changed, only that
file should be processed, not the others.
Furthermore, it is difficult to describe the
generated output in this case, because the output depends
on the input files, which are not known in advance.

### Proposal

Add `b.forEach()` which takes a glob-pattern, and calls
a handler on a file-by-file basis, providing a special `fs`
for convenient use (e.g. ensureDir before write) and `action`
providing means to register file dependencies.
