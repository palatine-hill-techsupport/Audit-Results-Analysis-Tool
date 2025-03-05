	function processFile() {
		const fileUpload = document.getElementById("fileUpload").files[0];
		if (!fileUpload) {
			alert("Please select a file to upload.");
			return;
		}
		const reader = new FileReader();
		reader.onload = function(e) {
			const data = new Uint8Array(e.target.result);
			const workbook = XLSX.read(data, {type: 'array'});
			const sheetName = workbook.SheetNames[0];
			const sheet = workbook.Sheets[sheetName];
			const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });

			console.log("Parsed Data:", jsonData); // Log the parsed data structure

			const summary = calculateSummaryPerformance(jsonData);
			const challenges = calculateCommonAuditChallenges(jsonData);
			const stateResults = calculateResultsByState(jsonData);
			const techResults = calculateTechPerformance(jsonData);
			const topBottomTechs = calculateTopBottomTechs(techResults);

			displayResults(summary, challenges, stateResults, topBottomTechs, techResults);
			generateChallengesChart(challenges);
		};
		reader.readAsArrayBuffer(fileUpload);
	}

        function calculateCommonAuditChallenges(data) {
            const challenges = {
                "Panel check front w/power on": 0,
                "Internet connected": 0,
                "FTA connected": 0,
                "Position marked w/tape": 0,
                "Spirit level shown": 0,
                "Bracket Secured": 0,
                "Cable hiding entry/exit": 0,
                "Peripherals connected & shown": 0,
                "Blocked/Unclear photos": 0,
                "Return photo required": 0,
                "Remove/Recycle photo required": 0,
                "Poor completion, too close": 0,
                "No completion": 0,
                "Front check, power on": 0,
                "Cleaned area": 0,
                "Transit bolts removed": 0,
                "Water clamp": 0,
                "Drainage hose": 0,
                "Spirit level w/stacked unit": 0,
                "Spirit level w/WM unit": 0,
                "Parts & manual left w/CX": 0,
                "Device(s) powered & working": 0,
                "Screenshot of data transfer(s)": 0,
                "Screenshot of software/apps installed": 0,
                "No missed photos, well done tech.": 0,
                "Small job, single photo, meets requirements.": 0,
                "Small job, photos meet requirements.": 0,
                "SKUs & image(s) don't match work": 0,
                "DTOW job ❌  No photo taken of variation.": 0,
            };
            
            for (let i = 1; i < data.length; i++) {
                const failureString = data[i][6];
                if (failureString) {
                    const failures = failureString.split("\n");
                    failures.forEach(failure => {
                        const trimmedFailure = failure.trim().replace(/^-\s*/, "");
                        if (challenges.hasOwnProperty(trimmedFailure)) {
                            challenges[trimmedFailure]++;
                        }
                    });
                }
            }
            return Object.entries(challenges).sort((a, b) => b[1] - a[1]);
        }

        function calculateResultsByState(data) {
            const states = {
                "Victoria": { pass: 0, fail: 0 },
                "New South Wales": { pass: 0, fail: 0 },
                "Queensland": { pass: 0, fail: 0 },
                "South Australia": { pass: 0, fail: 0 },
                "Western Australia": { pass: 0, fail: 0 },
                "Australian Capital Territory": { pass: 0, fail: 0 },
                "Tasmania": { pass: 0, fail: 0 },
                "Northern Territory": { pass: 0, fail: 0 }
            };
            
            for (let i = 1; i < data.length; i++) {
                const state = data[i][7];
                const result = data[i][4];
                if (state && result && states.hasOwnProperty(state)) {
                    if (result === "Pass") states[state].pass++;
                    else if (result === "Fail") states[state].fail++;
                }
            }
            return states;
        }

		function calculateTechPerformance(data) {
			const techs = {};
			for (let i = 1; i < data.length; i++) {
				const row = data[i];
				
				// Trim and check for blank values
				const tech = row[2] ? row[2].toString().trim() : "";
				const result = row[4] ? row[4].toString().trim() : null; // null if result is blank

				// Skip rows where "Audit Result" is blank
				if (!tech || !result) {
					console.log(`Skipping row ${i} due to missing tech or result`);
					continue;
				}

				// Process valid data
				if (!techs[tech]) techs[tech] = { pass: 0, fail: 0, total: 0 };
				if (result === "Pass") techs[tech].pass++;
				if (result === "Fail") techs[tech].fail++;
				techs[tech].total++;
			}
			return techs;
		}
		function calculateSummaryPerformance(data) {
			let passCount = 0, failCount = 0;
			for (let i = 1; i < data.length; i++) {
				const result = data[i][4]; // Column F: "Audit Result"
				if (result === "Pass") passCount++;
				if (result === "Fail") failCount++;
			}
			const total = passCount + failCount;
			return {
				passCount,
				failCount,
				passPercentage: total > 0 ? (passCount / total * 100).toFixed(2) : "0",
				failPercentage: total > 0 ? (failCount / total * 100).toFixed(2) : "0"
			};
		}

		function calculateTopBottomTechs(techs) {
			const techArray = Object.entries(techs)
				.filter(([tech, counts]) => counts.total >= 5)
				.map(([tech, counts]) => ({
					tech,
					passRate: counts.pass / counts.total || 0,
					passCount: counts.pass,
					failCount: counts.fail,
					totalJobs: counts.total
				}));

			// Sort Top Performers by highest pass rate
			const topPerformers = [...techArray].sort((a, b) => b.passRate - a.passRate).slice(0, 5);

			// Sort Bottom Performers by lowest pass rate, and then by most jobs if pass rates are equal
			const focusTechs = [...techArray]
				.sort((a, b) => {
					if (a.passRate === b.passRate) {
						return b.totalJobs - a.totalJobs; // Secondary sort by most jobs
					}
					return a.passRate - b.passRate; // Primary sort by lowest pass rate
				})
				.slice(0, 5);

			return { topPerformers, focusTechs };
		}

		function displayResults(summary, challenges, states, topBottomTechs, techs) {
			const resultDiv = document.getElementById("reportResults");
			resultDiv.innerHTML = `
				<div id="headertitle">
					<h1>Summary of Performance</h1>
					<p><h2><span class="pass">Passes: ${summary.passCount} (${summary.passPercentage}%)</span></h2></p>
					<p><h2><span class="fail">Fails: ${summary.failCount} (${summary.failPercentage}%)</span></h2></p>
				</div>
				
				<div id="challengesChartContainer">
					<canvas id="challengesChart"></canvas>
				</div>
				
				<details>
					<summary><h2>👆 Missing Photos by category</h2></summary>
					${challenges.map(([key, count]) => `<p>${key}: ${count}</p>`).join('')}
				</details>          
				<br>

				<h2>Results by State</h2>
				${Object.entries(states).map(([state, counts]) => `<p>${state}: <span class="pass">Pass - ${counts.pass}</span>, <span class="fail">Fail - ${counts.fail}</span></p>`).join('')}
				<br>
				
				<details>
					<summary><h2>👆 Individual Technician Results</h2></summary>
					${Object.entries(techs)
						.sort((a, b) => b[1].total - a[1].total)
						.map(([tech, counts]) => `<p>${tech}: <span class="pass">Pass - ${counts.pass}</span>, <span class="fail">Fail - ${counts.fail}</span> (${counts.total} jobs)</p>`)
						.join('')}
				</details>
				<br>
				
				<h2>Top Performers & Technicians to Focus On</h2>
				<h3>Top 5</h3>
				${topBottomTechs.topPerformers.map(tech => `<p>${tech.tech}: Pass Rate - ${(tech.passRate * 100).toFixed(2)}% (${tech.totalJobs} jobs)</p>`).join('')}
		
				<h3>Bottom 5</h3>
				${topBottomTechs.focusTechs.map(tech => {
					const passRate = tech.totalJobs > 0 ? ((tech.passCount / tech.totalJobs) * 100).toFixed(2) : "0.00";
					return `<p>${tech.tech}: Pass Rate - ${passRate}% (${tech.totalJobs} jobs)</p>`;
				}).join('')}
			`;
		}

function generateChallengesChart(challenges) {
    const chartContainer = document.getElementById('challengesChartContainer');
    const canvas = document.getElementById('challengesChart');
    
    // Set canvas width and height dynamically
    canvas.width = chartContainer.offsetWidth;
    canvas.height = Math.max(challenges.length * 25, 500);

    const ctx = canvas.getContext('2d');

    // Ensure all categories are shown, even those with zero count
    const labels = challenges.map(([key]) => key);
    const data = challenges.map(([, count]) => count);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Cases',
                data: data,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Cases'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Most Frequently Missing Photos (HST Comments) - Sorted by Frequency'
                }
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", function() {
	const changelogPopup = document.getElementById('changelog-popup');
	const changelogLink = document.getElementById('changelog-link');
	const closeButton = document.querySelector('.close-button');

	// Show popup on link click
	changelogLink.addEventListener('click', function(event) {
		event.preventDefault();
		changelogPopup.style.display = 'flex'; // Show the popup when clicked
	});

	// Hide popup on close button click
	closeButton.addEventListener('click', function() {
		changelogPopup.style.display = 'none'; // Hide the popup when close is clicked
	});

	// Hide popup when clicking outside the popup content area
	window.addEventListener('click', function(event) {
		if (event.target === changelogPopup) {
			changelogPopup.style.display = 'none';
		}
	});
});