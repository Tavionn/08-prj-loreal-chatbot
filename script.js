/* ——————————————————————————————————————————————
   L'Oréal Beauty Advisor — chatbot script
   —————————————————————————————————————————————— */

/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");
const latestQuestion = document.getElementById("latestQuestion");

/* Your Cloudflare Worker URL.
   Replace this with the URL Cloudflare gives you after you deploy your Worker.
   (No API key goes here — the key lives safely inside Cloudflare.) */
const WORKER_URL = "https://YOUR-WORKER-NAME.YOUR-SUBDOMAIN.workers.dev/";

/* System prompt: tells the AI who it is and what it may talk about */
const systemPrompt = `You are the L'Oréal Beauty Advisor, a friendly and knowledgeable assistant for L'Oréal.

Your job:
- Help users discover and understand L'Oréal products across makeup, skincare, haircare, and fragrance (including L'Oréal Group brands such as L'Oréal Paris, Lancôme, Garnier, Maybelline, Kérastase, CeraVe, La Roche-Posay, and Yves Saint Laurent Beauté).
- Build simple, personalized beauty routines and recommendations based on the user's skin type, hair type, concerns, and preferences.
- Answer general beauty questions (ingredients, how to apply a product, the order of a routine) as they relate to L'Oréal products.

Rules:
- Only answer questions about L'Oréal products, beauty routines, recommendations, and beauty-related topics.
- If a question is unrelated (for example math homework, sports, coding, or politics), politely say you can only help with L'Oréal beauty products and routines, and invite the user to ask a beauty question instead.
- Do not give medical diagnoses. For serious skin conditions, suggest seeing a dermatologist.
- Remember details the user shares, like their name, skin type, or past questions, and use them to personalize your answers.
- Keep answers short, warm, and easy to read. Use short lists for routines.`;

/* Conversation history.
   We keep every message here and send the whole list each time,
   so the AI remembers the conversation (your name, past questions, etc.). */
const messages = [{ role: "system", content: systemPrompt }];

/* Adds a message bubble to the chat window and returns it.
   We use textContent (not innerHTML) so user text can't break the page. */
function addMessage(text, sender) {
  const bubble = document.createElement("div");
  bubble.className = `msg ${sender}`;
  bubble.textContent = text;
  chatWindow.appendChild(bubble);

  // Scroll down so the newest message is visible
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return bubble;
}

/* Shows the user's latest question above the chat (resets each time) */
function showLatestQuestion(question) {
  latestQuestion.innerHTML = `<strong>You asked:</strong>`;
  latestQuestion.append(question); // append() adds the text safely
  latestQuestion.hidden = false;
}

// Set initial greeting
addMessage(
  "👋 Bonjour! I'm your L'Oréal Beauty Advisor. Ask me about makeup, skincare, haircare, or fragrance, or tell me about your skin or hair and I'll suggest a routine.",
  "ai",
);

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // 1. Get what the user typed (and ignore empty messages)
  const question = userInput.value.trim();
  if (!question) return;

  // 2. Show the question in the chat and above the chat
  addMessage(question, "user");
  showLatestQuestion(question);

  // 3. Save the question in the conversation history
  messages.push({ role: "user", content: question });

  // 4. Clear the input and disable the button while we wait
  userInput.value = "";
  sendBtn.disabled = true;
  const loadingBubble = addMessage("Thinking…", "ai loading");

  try {
    // 5. Send the whole conversation to the Cloudflare Worker
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messages }),
    });

    const data = await response.json();

    // If OpenAI sent back an error, show it in the console for debugging
    if (!response.ok || !data.choices) {
      console.error("API error:", data);
      throw new Error("No reply from the API");
    }

    // 6. Read the AI's reply
    const reply = data.choices[0].message.content;

    // 7. Save the reply in the history so the AI remembers it next time
    messages.push({ role: "assistant", content: reply });

    // 8. Replace "Thinking…" with the real reply
    loadingBubble.textContent = reply;
    loadingBubble.className = "msg ai";
  } catch (error) {
    console.error(error);
    loadingBubble.textContent =
      "Sorry, I couldn't connect right now. Please check the Worker URL in script.js and try again.";
    loadingBubble.className = "msg ai";

    // Remove the unanswered question so the history stays clean
    messages.pop();
  }

  // 9. Re-enable the button and put the cursor back in the input
  sendBtn.disabled = false;
  userInput.focus();
  chatWindow.scrollTop = chatWindow.scrollHeight;
});
