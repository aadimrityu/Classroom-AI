const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptform = document.querySelector(".prompt-form");
const promptInput = promptform.querySelector(".prompt-input");
const fileInput = promptform.querySelector("#file-input");
const fileUploadWrapper = promptform.querySelector(".file-upload-wrapper");
const themeToggle = document.querySelector("#theme-toggle-btn");

// API Setup
// const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyBNQflkPBDfHAY_stRlw1EsoiqPmuO49OA";
const API_URL = "http://127.0.0.1:5000/chat";
let typingInterval, controller;
const chatHistory = [];
const userData = { message: "", file: {} };

// Function to create message elements
const createMsgElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
}

// Scroll to the bottom of the container
const scorllToBottom = () => container.scrollTo({ top: container.scrollHeight, behavior: "smooth"});

// Simulate typing effect for bot responses
const typingEffect = (text, textelement, botMsgDiv) => {
    textelement.textContent = "";
    const words = text.split(" ");
    let wordIndex = 0;

    // Set an interval to type each
    typingInterval = setInterval(() => {
        if(wordIndex < words.length) {
            textelement.textContent += (wordIndex === 0 ? "": " ") + words[wordIndex++];
            scorllToBottom();
        }
        else{
            clearInterval(typingInterval);
            botMsgDiv.classList.remove("loading");
            document.body.classList.remove("bot-responding");
        }
    }, 40);
}

// Make the API call and generate the bot's response
const generateResponse = async (botMsgDiv) => {
    const textelement = botMsgDiv.querySelector(".message-text");
    controller = new AbortController();

    const formData = new FormData();
    formData.append("question", userData.message);

    if (userData.file.data) {
        const byteCharacters = atob(userData.file.data);
        const byteArrays = [];
        for (let i = 0; i < byteCharacters.length; i++) {
            byteArrays.push(byteCharacters.charCodeAt(i));
        }

        const byteArray = new Uint8Array(byteArrays);
        const blob = new Blob([byteArray], { type: userData.file.mime_type });
        const file = new File([blob], userData.file.fileName, { type: userData.file.mime_type });
        formData.append("file", file);
    }

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            body: formData,
            signal: controller.signal
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Something went wrong.");

        const responsetext = data.received_question.trim() || "No response received.";
        typingEffect(responsetext, textelement, botMsgDiv);
        chatHistory.push({ role: "model",  text: responsetext  });
        localStorage.setItem("chatHistory",JSON.stringify(chatHistory));
    } catch (error) {
        textelement.style.color = "#d62939";
        textelement.textContent = error.name === "AbortError" ? "Response generation stopped." : error.message;
        botMsgDiv.classList.remove("loading");
        document.body.classList.remove("bot-responding");
    } finally {
        userData.file = {};
    }
};
// const generateResponse = async (botMsgDiv) => {
//     const textelement = botMsgDiv.querySelector(".message-text");
//     controller = new AbortController();

//     // Add user message and file data to the chat history
//     chatHistory.push({
//         role : "user" ,
//         parts: [{ text: userData.message }, ...(userData.file.data ? [{ inline_data: (({ fileName, isImage, ...rest}) => rest) (userData.file) }] : [])]
//     });
//     try{
//         // Send the chat history to the API to get a response
//         const response = await fetch( API_URL , {
//            method: "POST",
//            headers: { "Content-Type": "application/json" },
//            body: JSON.stringify({ contents: chatHistory }), 
//            signal: controller.signal
//         });

//         const data = await response.json();
//         if (!response.ok) throw new Error(data.error.message);

//         // Process the response text and display with typinf effect
//         const responsetext = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
//         typingEffect(responsetext, textelement, botMsgDiv);
//         chatHistory.push({  role: "model" ,parts: [{text: responsetext}] });
//     }catch(error) {
//         textelement.style.color = "#d62939";
//         textelement.textContent = error.name === "AbortError" ? "Response generation stopped." : error.message;
//         botMsgDiv.classList.remove("loading");
//         document.body.classList.remove("bot-responding");
//     } finally {
//         userData.file = {};
//     }
// };

// Handle the form submission
const handleFormSubmit = (e) => {
    e.preventDefault();
    const userMessage = promptInput.value.trim();
    if ((!userMessage && !userData.file.data) || document.body.classList.contains("bot-responding")) return;

    promptInput.value = "";
    userData.message = userMessage;
    document.body.classList.add("bot-responding", "chats-active");
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");

    //Generate user message HTML and add in the chats container
    const userMsgHTML = `
  <p class="message-text"></p>
  ${userData.file.data ? 
    (userData.file.isImage ? 
      `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />` 
      : 
      `<p class="file-attachment">
        <span class="material-symbols-rounded">description</span>
        ${userData.file.fileName}
      </p>`
    ) 
: ""
  }`;

    const userMsgDiv = createMsgElement(userMsgHTML, "user-message");
    userMsgDiv.querySelector(".message-text").textContent = userMessage || " Attachment sent";
    chatsContainer.appendChild(userMsgDiv);
    scorllToBottom();
//     if (chatHistory.length === 0) {
//     addToRecentList(userMessage.length > 25 ? userMessage.slice(0, 25) + "..." : userMessage);
// }
//      chatHistory.push({ role: "model",  text: userMessage  });
//         localStorage.setItem("chatHistory",JSON.stringify(chatHistory));


    setTimeout(() => {
        //Generate bot message HTML and add in the chats container after 600ms
        const botMsgHTML = ' <img src="bot.jpg" alt="" class="avatar"><p class="message-text">Just a sec...</p>';
        const botMsgDiv = createMsgElement(botMsgHTML, "bot-message", "loading");
        chatsContainer.appendChild(botMsgDiv);
        scorllToBottom();
        generateResponse(botMsgDiv);
    }, 600);
}

// Handle file input change(file upload)
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if(!file) return;

    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) => {
        fileInput.value = "";
        const base64String = e.target.result.split(",")[1];
        fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
        fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached" );

        // Store file data in userData obj
        userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage};
    }
});

// Cancel file upload
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
    userData.file = {};
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached" ); 
});

// Stop ongoing bot response
document.querySelector("#stop-response-btn").addEventListener("click", () => {
    userData.file = {};
    controller?.abort();
    clearInterval(typingInterval);
    chatsContainer.querySelector(".bot-message.loading").classList.remove("loading");
    document.body.classList.remove("bot-responding");
});

// Delete all chats
document.querySelector("#delete-chats-btn").addEventListener("click", () => {
    chatHistory.length = 0;
    chatsContainer.innerHTML = "";
    document.body.classList.remove("bot-responding", "chats-active");
});
// NEW CHAT BTN
document.querySelector(".new-chat-btn").addEventListener("click",()=>{
    chatsContainer.innerHTML = "";
    chatHistory.length =0;
    document.body.classList.remove("bot-responding", "chats-active");
    container.scrollTo({top:0,behavior :"smooth"});
    promptInput.value = "";

})
// Handle Suggestion click
document.querySelectorAll(".suggestion-item").forEach(item => {
    item.addEventListener("click", () => {
        promptInput.value = item.querySelector(".text").textContent;
        promptform.dispatchEvent(new Event("submit"));
    });
});

// Show/hide controls for mobile on prompt input focus
document.addEventListener("click", ({ target }) => {
    const wrapper = document.querySelector(".prompt-wrapper");
    const shouldHide = target.classList.contains("prompt-input") || (wrapper.classList.contains
    ("hide-controls") && (target.id === "add-file-btn" || target.id === "stop-response-btn"));
    wrapper.classList.toggle("hide-controls", shouldHide);
});

// Toggle dark/light theme
themeToggle.addEventListener("click", () => {
    const isLightTheme = document.body.classList.toggle("light-theme");
    localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
    themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";
});

// Set initial theme from local storage
const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
document.body.classList.toggle("light-theme", isLightTheme);
themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";

promptform.addEventListener("submit", handleFormSubmit);
promptform.querySelector("#add-file-btn").addEventListener("click",() => fileInput.click());

/* === APPEND THIS TO YOUR EXISTING script.js === */

// --- Sidebar Functionality ---
document.addEventListener('DOMContentLoaded', () => {
    // Ensure sidebar elements exist before adding listeners
    const menuToggle = document.getElementById('menuToggle');
    const closeBtn = document.getElementById('closeBtn');
    const sidebar = document.getElementById('sidebar');
    const contentArea = document.querySelector('.content'); // Get the main content area
    const body = document.body;

    // Function to toggle sidebar
    const toggleSidebar = () => {
        if (!sidebar) return; // Exit if sidebar not found
        sidebar.classList.toggle('collapsed');

        // Toggle expanded class for mobile overlay check
        if (sidebar.classList.contains('collapsed')) {
            sidebar.classList.remove('expanded'); // Ensure expanded is removed when collapsed
            body.classList.remove('sidebar-expanded');
        } else {
            sidebar.classList.add('expanded'); // Add expanded class when not collapsed
             if (window.innerWidth <= 768) { // Check breakpoint for body class
                 body.classList.add('sidebar-expanded');
             }
        }
    };

    // --- Event Listeners for Sidebar ---

    // Toggle sidebar with the hamburger button
    if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent click bubbling to document
            toggleSidebar();
        });
    }

    // Close sidebar with the internal close button
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSidebar();
        });
    }

    // Optional: Close sidebar if clicking outside of it on mobile/overlay mode
    if (contentArea) { // Listen on content area or body
        document.addEventListener('click', (event) => {
            if (!sidebar || !menuToggle) return; // Ensure elements exist

            const isClickInsideSidebar = sidebar.contains(event.target);
            const isClickOnToggle = menuToggle.contains(event.target);

            // Check if sidebar should close (is expanded and click is outside)
            if (sidebar.classList.contains('expanded') && !isClickInsideSidebar && !isClickOnToggle) {
                // Add condition for overlay behavior if needed (e.g., check window width)
                 if (window.innerWidth <= 768) { // Only close on outside click on smaller screens (if using overlay)
                     toggleSidebar();
                 }
            }
        });
    }
  
//     window.addEventListener("DOMContentLoaded", () => {
//     const savedHistory = JSON.parse(localStorage.getItem("chatHistory") || "[]");

//     savedHistory.forEach(chat => {
//         const msgDiv = createMsgElement(
//             <p class="message-text">${chat.text}</p>,
//             chat.role === "user" ? "user-message" : "bot-message"
//         );
//         chatsContainer.appendChild(msgDiv);
//     });

//     if (savedHistory.length > 0) {
//         chatHistory.push(...savedHistory); // optional
//         document.body.classList.add("chats-active");
//         scorllToBottom();
//     }
// });

    // Optional: Initialize sidebar state based on screen size
    // Uncomment and adjust if you want it collapsed by default on mobile
    // if (window.innerWidth <= 768) {
    //     if (sidebar && !sidebar.classList.contains('collapsed')) {
    //        sidebar.classList.add('collapsed');
    //        sidebar.classList.remove('expanded');
    //     }
    // } else {
    //      if (sidebar && sidebar.classList.contains('collapsed')) {
             // Optional: Ensure it's expanded on larger screens on load
             // sidebar.classList.remove('collapsed');
             // sidebar.classList.add('expanded');
    //      }
    // }

}); // End DOMContentLoaded for Sidebar