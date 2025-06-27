// script.js

const versionSelect = document.getElementById("versionSelect");
const cliCode = document.getElementById("cliCode").querySelector("code");
const stepGuide = document.getElementById("stepGuide");
const downloadBtn = document.getElementById("downloadBtn");
const installationSection = document.getElementById("installation-section"); // Get installation section

// Stars elements for scroll speed effect
const globalStars = document.querySelectorAll('.global-star');
let lastScrollY = window.scrollY;
let scrollTimeout;
const originalDriftDuration = 20; // Base duration in seconds for the stars

// Event: Change version from dropdown
versionSelect.addEventListener("change", () => {
    updateContent();
    // Smooth scroll to the installation section
    installationSection.scrollIntoView({ behavior: 'smooth' });
});

// Event: Download button click
downloadBtn.addEventListener("click", () => {
    const version = versionSelect.value;
    // Format: cosmo4u-0.0.1-amd64.deb (remove 'v' and use hyphen)
    const formattedVersion = version.replace('v', '');
    const fileName = `cosmo4u-${formattedVersion}.deb`;
    const fileUrl = `deb_files/${fileName}`; // Assuming deb_files/cosmo4u-0.0.1-amd64.deb structure
    window.open(fileUrl, "_blank");
});

function updateContent() {
    const version = versionSelect.value;
    // Format: cosmo4u-0.0.1-amd64.deb (remove 'v' and use hyphen)
    const formattedVersion = version.replace('v', '');
    const fileName = `cosmo4u-${formattedVersion}.deb`;

    // Update the one-line terminal installation command
    // Ensure the wget URL and dpkg command use the new filename format
    cliCode.textContent = `wget -O ${fileName} https://github.com/bhuvanesh-m-dev/cosmo4u/releases/download/${version}/${fileName} && sudo dpkg -i ${fileName} || sudo apt --fix-broken install`;


    // Update the step-by-step guide dynamically
    fetch(`version/${version}.txt`)
        .then(res => {
            if (!res.ok) throw new Error("Guide not found");
            return res.text();
        })
        .then(text => {
            const steps = text
                .split("\n")
                .filter(line => line.trim() !== "");

            let html = '';

            // Add plain guide intro
            html += `<li style="margin: 10px 0; font-size: 16px; color: #eee;">Download the ${fileName} from this webpage.</li>`;
            html += `<li style="margin: 10px 0; font-size: 16px; color: #eee;">Open your terminal using Ctrl + Alt + T or from the app drawer.</li>`;


            // Bash command blocks with non-overlapping animated copy buttons
            const commandBlockStyle = `
                position: relative;
                background: #1e1e1e;
                color: #dcdcdc;
                padding: 15px 15px;
                border-radius: 8px;
                margin: 10px 0;
                font-family: monospace;
                font-size: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;

            const copyBtnStyle = `
                background-color: #2ea043;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                transition: background-color 0.3s ease, transform 0.2s ease;
            `;

            const copyBtnHoverStyle = `
                this.style.backgroundColor = '#24923a';
                this.style.transform = 'scale(1.05)';
            `;

            const copyBtnLeaveStyle = `
                this.style.backgroundColor = '#2ea043';
                this.style.transform = 'scale(1)';
            `;

            function renderBlock(cmd) {
                return `
                    <li style="${commandBlockStyle}">
                        <code style="flex: 1;">${cmd}</code>
                        <button
                            onclick="copyDynamicCmd(this)"
                            onmouseover="${copyBtnHoverStyle}"
                            onmouseout="${copyBtnLeaveStyle}"
                            style="${copyBtnStyle}"
                        >📋 Copy</button>
                    </li>
                `;
            }

            html += renderBlock("cd ~/Downloads");
            html += renderBlock(`sudo dpkg -i ${fileName}`); // Use the new filename here
            html += `<li style="margin: 10px 0; font-size: 16px; color: #eee;">After installation, launch the app using:</li>`;
            html += renderBlock("cosmo4u");

            stepGuide.innerHTML = html;
        })
        .catch(err => {
            stepGuide.innerHTML = `<li>Installation guide not available for this version.</li>`;
            console.error("Error fetching guide:", err); // Log error for debugging
        });
}

function copyToClipboard(elementId) {
    const text = document.getElementById(elementId).innerText;
    navigator.clipboard.writeText(text).then(() => {
        alert("Copied to clipboard!");
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}

function copyDynamicCmd(btn) {
    const code = btn.parentElement.querySelector("code").innerText;
    navigator.clipboard.writeText(code).then(() => {
        btn.innerText = "✅ Copied";
        setTimeout(() => (btn.innerText = "📋 Copy"), 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}

// Function to handle scroll and adjust star speed
function handleScroll() {
    const currentScrollY = window.scrollY;
    const scrollDelta = Math.abs(currentScrollY - lastScrollY);
    lastScrollY = currentScrollY;

    // Clear any existing timeout to prevent rapid changes
    clearTimeout(scrollTimeout);

    if (scrollDelta > 0) { // User is scrolling
        // Increase star speed (decrease duration)
        const speedFactor = 1 - Math.min(scrollDelta / 200, 0.8); // Max 80% speed increase
        const newDuration = originalDriftDuration * speedFactor;

        globalStars.forEach(star => {
            star.style.setProperty('--drift-duration', `${newDuration}s`);
        });

        // Set a timeout to revert to original speed after scrolling stops
        scrollTimeout = setTimeout(() => {
            globalStars.forEach(star => {
                star.style.setProperty('--drift-duration', `${originalDriftDuration}s`);
            });
        }, 300); // Revert after 300ms of no scrolling
    }
}

window.addEventListener('scroll', handleScroll);


// Scroll to top button functionality
const scrollToTopBtn = document.getElementById("scrollToTopBtn");

window.addEventListener("scroll", () => {
    if (window.scrollY > 300) { // Show button after scrolling down 300px
        scrollToTopBtn.classList.add("show");
    } else {
        scrollToTopBtn.classList.remove("show");
    }
});

scrollToTopBtn.addEventListener("click", () => {
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});


// Initialize default version on load
window.addEventListener("DOMContentLoaded", updateContent);
