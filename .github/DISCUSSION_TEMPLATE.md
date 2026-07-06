---
title: "[Discussion Title]"
body:
  - type: markdown
    attributes:
      value: |
        Welcome to PAWPHILE Discussions! Please use this forum to ask architectural questions, discuss veterinary ML concepts, or seek help with local deployments.
  - type: textarea
    id: question
    attributes:
      label: What is your question or discussion topic?
      description: Provide as much detail as possible.
    validations:
      required: true
  - type: dropdown
    id: category
    attributes:
      label: Category
      options:
        - Architecture & Deployment
        - Vision AI & Machine Learning
        - Veterinary Informatics & Clinical Rules
        - General Q&A
    validations:
      required: true
