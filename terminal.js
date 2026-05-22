/**
 * Seitou Mizuki Secure Node - Terminal Command Interpreter
 * Handles all command line operations and outputs.
 */

window.TerminalInterpreter = (() => {
  // Saved Command History
  let decryptedLogs = {
    fragment_009: "TRANSCRIBED FRAGMENT_009:\n\"They think structure is absolute. That the grids they place around us hold our thoughts. But grids are just guidelines. The spaces between the lines—that's where we run.\"\n- STATUS: DECRYPTED BY USER",
    birth_records: "SUBJECT CLASSIFIED METRICS:\n- NAME: Seitou Mizuki (勢藤美月)\n- DESIGNATION: Subject Designated MIZUKI / SECURE_NODE_04\n- D.O.B: 18-09-2009 (Status: Authentic)\n- GENETIC MARKERS: Enhanced cognitive retention, high adaptability.\n- NOTE: Early potential identified by mentor during Sector 7 audit.",
    incident_224: "LOG INDEX [INCIDENT_224 - SECURE RECOVERY]:\n- DATE: 12-04-2024\n- LOCATION: Sector 4 mainframe node\n- DETAILS: Unauthorized packet intercept detected. Operative Mizuki successfully redirected trace routing back to source node, preventing security collapse. Mainframe integrity preserved.\n- RECOMMENDATION: Advance Clearance Level to Level 04.",
    academy_report: "ACADEMY DIAGNOSTIC EVALUATION:\n- TARGET: Mizuki\n- COGNITIVE APTITUDE: 99.1% (Class Peak)\n- REBELLION METRIC: 84.7% (Extreme Risk Profile)\n- REMARKS: 'Extremely capable. Refuses conventional logic paths. Requires dynamic challenges. If left unchallenged, she will dismantle the school network again. Standard disciplinary measures are ineffective.'\n- STATUS: Archival complete."
  };

  const commandList = {
    help: "Lists all available commands in this security terminal.",
    clear: "Clears the screen of all terminal outputs.",
    about: "Displays basic operative dossier on Subject Seitou Mizuki.",
    status: "Runs diagnostic checks on Secure Node systems and connections.",
    logs: "Displays list of encrypted archive logs currently accessible.",
    decrypt: "Decrypts a specific log node. Usage: decrypt [log_name]",
    theme: "Changes system HUD color palette. Usage: theme [blue|purple|green]",
    easteregg: "Triggers secondary network protocols.",
    home: "Exits terminal node and returns to character directory index."
  };

  function interpret(commandString) {
    const parts = commandString.trim().toLowerCase().split(/\s+/);
    const cmd = parts[0];
    const arg = parts.slice(1).join(" ");

    if (!cmd) return [];

    switch (cmd) {
      case "help":
        let helpLines = ["=== AVAILABLE NODE COMMANDS ==="];
        for (const [name, desc] of Object.entries(commandList)) {
          helpLines.push(`  ${name.padEnd(12)} - ${desc}`);
        }
        return helpLines;

      case "clear":
        return ["__CLEAR__"];

      case "about":
        return [
          "====================================================",
          "SUBJECT DOSSIER: SEITOU MIZUKI // 勢藤美月",
          "====================================================",
          "CODENAME:         MIZUKI / Z3RO-S",
          "ROLE:             Systems Operative / Network Intruder",
          "AGE:              17 Years Standard",
          "STATUS:           Active / Under Surveillance",
          "AFFILIATION:      Independent Rebellion Core",
          "KEY CREDENTIALS:  Primary author of MIZUKI Secure Nodes.",
          "COGNITIVE PROFILE: Exceptional logic traversal, high-level",
          "                  cryptographic intuition, stubborn refusal",
          "                  of hierarchical control frameworks.",
          "===================================================="
        ];

      case "status":
        return [
          "RUNNING SECURITY DIAGNOSTICS...",
          "NODE STABILITY:   98.42% (STABLE)",
          "DECRYPTION CORE:  ONLINE (CRYPTO-LINK v9.7)",
          "FIREWALL DEPTH:   14 GATEWAYS (ACTIVE)",
          "PHOTON EMITTER:   60 FPS GENERATION (SYNCHRONIZED)",
          "LOCAL IP SHIELD:  ENCRYPTED [AES-256-GCM]",
          "CONNECTION TYPE:  SECURE PROXY PEER-TO-PEER",
          "STATUS OVERALL:   SECURE"
        ];

      case "logs":
        return [
          "=== SECURED DATA NODES ===",
          "Use command 'decrypt [log_name]' to read records:",
          ...Object.keys(decryptedLogs).map(log => `  - ${log}`)
        ];

      case "decrypt":
        if (!arg) {
          return ["ERROR: Usage requires target. Enter 'decrypt [log_name]'.", "Type 'logs' to see available files."];
        }
        if (decryptedLogs[arg]) {
          return ["__DECRYPT_START__", arg, decryptedLogs[arg]];
        } else {
          return [`DECRYPTION ERROR: Target log '${arg}' not found or corrupted.`];
        }

      case "theme":
        if (!arg) {
          return ["ERROR: Usage requires theme name. Usage: theme [blue|purple|green]"];
        }
        if (["blue", "purple", "green"].includes(arg)) {
          // Send event to app.js to switch theme
          const event = new CustomEvent("changeTheme", { detail: { theme: arg } });
          window.dispatchEvent(event);
          return [`THEME DYNAMIC ACCENTS SET TO: ${arg.toUpperCase()}`];
        } else {
          return [`THEME ERROR: Accent '${arg}' is invalid. Options: blue, purple, green.`];
        }

      case "easteregg":
        // Dispatch easter egg action to canvas
        const eggEvent = new CustomEvent("triggerGlitch");
        window.dispatchEvent(eggEvent);
        return [
          "⚠️ WARNING: QUANTUM NODE STABILITY GLITCH DETECTED!",
          "Bypassing grid restrictions...",
          "Mizuki's Playground Mode activated. Have fun surfing the grid lines.",
          "🌌 [PHOTON COLLISION MATRIX MULTIPLIED]"
        ];

      case "home":
        setTimeout(() => {
          window.location.hash = "#/";
        }, 300);
        return ["EXITING TERMINAL NODE... ROUTING TO MAIN ACCESS GRID."];

      default:
        return [
          `COMMAND NOT RECOGNIZED: '${cmd}'`,
          "Type 'help' to show all available terminal commands."
        ];
    }
  }

  return {
    interpret
  };
})();
