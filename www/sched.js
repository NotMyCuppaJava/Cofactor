let factors = {};

function partition_seven(n) {
    if (n <= 0) return Array(7).fill(0);
    const output = Array(7).fill(0);
    const jump = 7 / n;
    for (let i = 0; i < n; i++) {
        output[Math.trunc(i * jump)] += 1;
    }
    return output;
}

async function loadJSON() {
    try {
        const response = await fetch("./interaction_matrix.json");
        factors = await response.json();
    } catch (error) {
        console.error("Error loading JSON:", error);
    }   
}

function getFactor(suppA, suppB) {
    if (typeof suppA !== 'string' || typeof suppB !== 'string') return 0;

    const substance_a = suppA.toLowerCase();
    const substance_b = suppB.toLowerCase();

    try {
        return factors[substance_a]?.[substance_b] ?? 0;
    } catch {
        return 0;
    }  
}

function daysFromMeds(meds) {
    const calendar = Array.from({length: 7}, () => []);

    for (const med of meds) {
        let augment = Array.from({length: 7}, () => []);
        const supp = med[0];
        const no = med[1];

        const x = partition_seven(no);

        for (let idx = 0; idx < 7; idx++) {
            augment[idx] = [...augment[idx], ...Array(x[idx]).fill(supp)];
        }

        let bestidx = 0;
        let bestscore = Infinity;

        for (let i = 0; i < 7; i++) {
            let inconvenience = 0;
            for (let j = 0; j < 7; j++) {
                let issue = 0;
                for (const item of calendar[j]) {
                    issue += getFactor(supp, item);
                }
                inconvenience += issue * augment[(j - i + 7) % 7].length;
            }
            if (inconvenience < bestscore) {
                bestscore = inconvenience;
                bestidx = i;
            }
        }

        const shift = (7 - (bestidx % 7)) % 7;
        augment = [...augment.slice(shift), ...augment.slice(0, shift)];

        for (let i = 0; i < 7; i++) {
            calendar[i] = [...calendar[i], ...augment[i]];
        }
    }
    return calendar;
}

function fillDay(medications, slots) {
    const daySchedule = {};
    for (const slot of slots) {
        daySchedule[slot] = [];
    }
    const [s, sch] = populateSlots(daySchedule, medications, slots);
    return sch;
}

function populateSlots(currentDay, medications, slots) {
    if (medications.length === 0) {
        return [scoreDay(currentDay), structuredClone(currentDay)];
    }

    let best_score = -Infinity;
    let best_schedule = null;
    const current = medications[0];

    for (const key in currentDay) {
        if (currentDay[key].includes(current)) continue; // This is actually a temporary fix
        currentDay[key].push(current);

        const [score, schedule] = populateSlots(currentDay, medications.slice(1), slots);

        currentDay[key].pop();

        if (score > best_score) {
            best_score = score;
            best_schedule = schedule;
        }
    }
    return [best_score, best_schedule];
}
function scoreDay(currentDay) {
    const converted = [];
    let slotIndex = 0;

    for (const key in currentDay) {
        // Extract numeric hour if available (e.g., "8AM" -> 8), or fallback to sequential slot index
        let numVal = parseFloat(key);
        if (isNaN(numVal)) {
            numVal = slotIndex;
        }

        for (const item of currentDay[key]) {
            converted.push([item, numVal]);
        }
        slotIndex++;
    }

    if (converted.length === 0) return 0;

    let score = 0;
    for (let i = 0; i < converted.length; i++) {
        let current = 1;
        for (let j = 0; j < converted.length; j++) {
            if (i !== j) {
                const factor = getFactor(converted[i][0], converted[j][0]);
                const diff = Math.abs(converted[i][1] - converted[j][1]);
                current *= (1 - factor * Math.exp(-diff * 0.9));
            }
        }
        score += current / converted.length;
    }

    return score;
}
function generateSchedule(slots, meds) {
    const actual = [];
    const calendar = daysFromMeds(meds);

    for (const day of calendar) {
        actual.push(fillDay(day, slots));
    }

    for (const row of actual) {
        console.log(row);
    }

    return actual;
}