# How It Works

Ever wondered what happens when you paste a URL and hit **Convert**? Here's a peek under the hood of the Page Converter engine.

## Step by Step

1. **Link Validation**  
   You submit a URL. Our app quickly verifies that it's a valid, accessible public web address.

2. **Content Extraction**  
   The request is handed off to our background [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server. It fetches the webpage, slices through the noise (like ads, popups, and navigation menus), and isolates the core content.

3. **Real-Time Streaming**  
   You don't have to wait in the dark. As the engine processes the page and converts HTML to Markdown, it streams live progress updates directly to your screen.

4. **Instant Delivery**  
   The final, pristine Markdown is delivered. You can preview it fully formatted, toggle the raw code view, copy it to your clipboard, or download it as a `.md` file for your own use.

---

## The Tech Stack

We've built Page Converter using modern, reliable technologies to ensure a seamless experience:

| Component             | Technology                                                                                   |
| :-------------------- | :------------------------------------------------------------------------------------------- |
| **Frontend UI**       | [React](https://react.dev) + [Material UI (MUI)](https://mui.com) for a clean, snappy design |
| **Web Framework**     | [Next.js](https://nextjs.org) (App Router) for robust server and client-side operations      |
| **Conversion Engine** | Powered by an underlying [Model Context Protocol](https://modelcontextprotocol.io) server    |
| **Speed & Caching**   | Built-in caching ensures repeated requests for the same URL load almost instantly            |
