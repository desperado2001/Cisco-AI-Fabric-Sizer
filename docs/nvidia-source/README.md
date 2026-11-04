# Vendor source documents (local only, sensitive)

This folder holds vendor source documents for local reference. Everything in it except this README is excluded by `.gitignore` and is never committed or pushed. CI and other clones do not have these files.

The contents are sensitive and are used for guidance only:

- Do not copy text, tables, figures, document titles or document IDs into code, comments, tests, docs, commit messages or PR descriptions.
- Express any rule they inform as engineering logic, such as port and radix arithmetic, labeled as Cisco engineering planning pending validation, and cover it with a test.
