Scripts for generating flow summaries of npm packages and their transitive dependencies.

Run `create-package.sh` to generate a `package.json` file listing a given set of packages as dependencies, then do `npm install`.

Now run `collect.js` from within the directory containing the `package.json` file (with `odasa` set up) to generate the summaries. Summaries are generated in reverse topological order, that is, if `p` depends on `q`, we first generate summaries for `q` and use them in the analysis of `p`. Final summaries are stored in `additional-sources.csv` and `additional-sinks.csv` in the working directory. (*NOTE*: If these files already exist, they are overwritten without warning.)
