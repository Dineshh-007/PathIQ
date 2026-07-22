# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: multiplayer.spec.ts >> Multiplayer Peer Interview Platform End-to-End >> Complete session flow with 3 peers
- Location: tests/multiplayer.spec.ts:4:7

# Error details

```
Test timeout of 90000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - img [ref=e8]
  - alert [ref=e11]
  - generic [ref=e12]:
    - navigation [ref=e13]:
      - generic [ref=e14]:
        - link "⚡ PeerPrep" [ref=e15] [cursor=pointer]:
          - /url: /
          - generic [ref=e16]: ⚡
          - generic [ref=e17]: PeerPrep
        - generic [ref=e18]:
          - generic [ref=e19]:
            - generic [ref=e20]: A
            - generic [ref=e21]: Alice
          - button "Sign Out" [ref=e22] [cursor=pointer]
    - main [ref=e23]:
      - generic [ref=e24]:
        - heading "Ready to practice, Alice?" [level=1] [ref=e25]
        - paragraph [ref=e26]: Create a new interview room or join an existing session with your study group.
      - generic [ref=e27]: ⚠️ Failed to create room
      - generic [ref=e28]:
        - generic [ref=e29]:
          - generic [ref=e30]: 🛠️
          - heading "Create a Room" [level=2] [ref=e31]
          - paragraph [ref=e32]: Host a session for up to 5 participants. You'll get a unique 6-character room code to share with your group.
          - generic [ref=e33]:
            - generic [ref=e34]:
              - generic [ref=e35]: 👥
              - generic [ref=e36]: 5 participants max
            - generic [ref=e37]:
              - generic [ref=e38]: 🗳️
              - generic [ref=e39]: 5 questions to vote from
            - generic [ref=e40]:
              - generic [ref=e41]: 🔒
              - generic [ref=e42]: Private scoring rounds
            - generic [ref=e43]:
              - generic [ref=e44]: ⏱️
              - generic [ref=e45]: Server-enforced timers
          - button "+ Create New Room" [ref=e46] [cursor=pointer]
        - generic [ref=e47]:
          - generic [ref=e48]: 🔗
          - heading "Join a Room" [level=2] [ref=e49]
          - paragraph [ref=e50]: Got a room code from your study partner? Enter it below to join their interview session directly.
          - generic [ref=e51]:
            - generic [ref=e52]:
              - generic [ref=e53]: Room Code
              - textbox "e.g. AB12CD" [ref=e54]
            - button "Join Session →" [disabled] [ref=e55]
          - paragraph [ref=e56]: Room codes are exactly 6 characters
      - generic [ref=e57]:
        - generic [ref=e58]:
          - heading "Your Stats" [level=3] [ref=e59]
          - generic [ref=e60]:
            - generic [ref=e62]: Sessions
            - generic [ref=e63]:
              - generic [ref=e64]: —
              - generic [ref=e65]: Avg Score
        - generic [ref=e66]:
          - heading "💭 Pro Tip" [level=3] [ref=e67]
          - paragraph [ref=e68]: 📊 Scores are sealed until all 4 interviewers submit — no anchoring bias.
        - generic [ref=e69]:
          - heading "Available Roles" [level=3] [ref=e70]
          - generic [ref=e71]:
            - generic [ref=e72]: 💻 SWE
            - generic [ref=e73]: 🧠 AI Eng
            - generic [ref=e74]: 📊 Data
            - generic [ref=e75]: 🌐 Web
            - generic [ref=e76]: 🔐 Security
            - generic [ref=e77]: ⚙️ DevOps
```