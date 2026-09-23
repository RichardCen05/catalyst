from step_drawio import Steps, L, R, T, B

s = Steps("Chatbot memory context", "question to verified answer")

store = s.node("Browser Store", "where we keep what you saved", col=0, row=0)
memsync = s.node("Memory Backup", "we load your saved memory", col=1, row=0)
panel = s.node("Chat Panel", "we remember what page you are on", col=2, row=0)

chat = s.node("Question Check", "we check your question is safe", col=2, row=1)
engine = s.node("Answer Engine", "we find which stock you mean", col=1, row=1)
follow = s.node("Word Sorter", "we sort out words like that one", col=0, row=1)

retrieval = s.node("Info Finder", "we take info from page titles and records", col=0, row=2)
handler = s.node("Answer Picker", "we pick the best way to answer", col=1, row=2)
llm = s.node("Answer Writer", "we summarize all of that with LLM", col=2, row=2)

s.step(store, memsync, "we send what you saved before", exit=R(), entry=L(), direct=True)
s.step(memsync, panel, "we bring your memory to the chat", exit=R(), entry=L(), direct=True)
s.step(panel, chat, "we send your question and recent chat", exit=B(), entry=T(), direct=True)
s.step(chat, engine, "we pass along your cleaned question", exit=L(), entry=R(), direct=True)
s.step(engine, follow, "we work out what itu and that one mean", exit=L(), entry=R(), direct=True)
s.step(follow, retrieval, "we look for matching titles and records", exit=B(), entry=T(), direct=True)
s.step(retrieval, handler, "we gather the matching pages and numbers", exit=R(), entry=L(), direct=True)
s.step(handler, llm, "we write the final answer", exit=R(), entry=L(), direct=True)

s.link(llm, memsync, "we save your feedback for next time", exit=R(), entry=T(), corridor=s.corridor(after_col=2))

s.note("For example, what we saved: your list has ANTM and BBCA, you own BBCA, and you left one note on ANTM we still need to check.", col=0, row=3)

s.write("docs/diagrams/chatbot-memory-context.drawio")
