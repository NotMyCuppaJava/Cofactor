let data;
let sampleData;
let supps = [];
let slots = [7.5, 12, 20];
let calendars = [];
let today = 0;
let offset = 0;

// Keys match lower-case anchor values from the JSON
const translatorx = {
    "breakfast": 0,
    "lunch": 1,
    "dinner": 2
};

const translatory = {
    "breakfast": 0,
    "dinner": 1
};

class prescription {
    constructor (medication, daysperweek) {
        this.medication = medication;
        this.dpw = daysperweek;
    }
}

class timeStamp {
    constructor (day, hour, medication) {
        this.day = day;
        this.hour = hour;
        this.medication = medication;
    }
}

function loadData() {
    const localInfo = localStorage.getItem('info');
    if (!localInfo) {
        console.log("DATA NOT THERE;"); 
        return;
    }
    const info = JSON.parse(localInfo);
    if (info.meds) {
        supps = info.meds.map(med => new prescription(med[0], med[1]));
    }
    if (info.slots) {
        slots = info.slots;
    }
    console.log("DATA LOADED!");
}

function saveData() {
    localStorage.setItem('info', JSON.stringify({
        slots: slots,
        meds: supps.map(med => [med.medication, med.dpw])
    }));
    console.log("DATA SAVED!");
}

async function loadJSON() {
    try {
        const response = await fetch("./interaction.json");
        data = await response.json();
        console.log("JSON Data:", data);
    } catch (error) {
        console.error("Error loading JSON:", error);
    }   
    try {
        populate();
    } catch (e) {
        console.error("Populate error:", e);
    }
}

function loadSupps() {
    if (supps.length === 0) {
        supps = [
            new prescription("Iron", 2),
            new prescription("Folate", 3),
            new prescription("Zinc", 2),
            new prescription("Potassium", 1),
            new prescription("Vitamin D3", 1),
            new prescription("Magnesium", 4),
            new prescription("Vitamin B12", 3),
            new prescription("Omeprazole", 7)
        ];
    }
    
    const rackbody = document.getElementById("rackbodyx");
    if (!rackbody) return;
    rackbody.innerHTML = "";
    for (const med of supps) {
        const suppdiv = document.createElement("div");
        suppdiv.className = "supplement";
        const supptext = document.createElement("p");
        supptext.innerHTML = med.medication + "<br><br> (" + med.dpw + "/week)";
        suppdiv.appendChild(supptext);
        rackbody.appendChild(suppdiv);
    }
}

function calculateSchedule(medic, slotz) {
    const medications = medic || (supps.length > 0 ? supps : [
        new prescription("Iron", 2),
        new prescription("Folate", 3),
        new prescription("Zinc", 2),
        new prescription("Potassium", 1),
        new prescription("Vitamin D3", 1)
    ]);

    const activeSlots = slotz || slots;
    const schedule = [];
    for (let i = 0; i < 7 * activeSlots.length; i++) {
        schedule.push([]);
    }

    const queue = [];
    for (const med of medications) {
        for (let i = 0; i < med.dpw; i++) {
            queue.push(med);
        }
    }

    fillSchedule(queue, schedule);
    calendars = schedule;
    return schedule;
}

function fillSchedule(meds, sched) {
    if (meds.length === 0) {
        return true;
    }

    const currentmed = meds[0].medication;
    const qcm = meds[0].dpw;
    const badslots = new Set();
    const pslots = [];
    const okslots = [];

    const minbar = Math.max(1, Math.floor(sched.length / qcm));

    // Flag slots within minbar distance of existing same medication
    for (let i = 0; i < sched.length; i++) {
        if (sched[i].includes(currentmed)) {
            for (let j = -minbar + 1; j < minbar; j++) {
                const r = ((i + j) % sched.length + sched.length) % sched.length;
                badslots.add(r);
            }
        }
    }

    // Determine target meal anchor safely
    const rawAnchor = (data && data.anchors && data.anchors[currentmed]) ? data.anchors[currentmed] : "any";
    const anchor = rawAnchor.toLowerCase();

    // Evaluate valid vs cofactor slots
    for (let i = 0; i < sched.length; i++) {
        if (anchor !== "any") {
            if (sched.length === 21 && anchor in translatorx) {
                if (i % 3 !== translatorx[anchor]) {
                    continue;
                }
            } else if (sched.length === 14 && anchor in translatory) {
                if (i % 2 !== translatory[anchor]) {
                    continue;
                }
            }
        }

        const isBad = badslots.has(i);
        let isCofactor = false;
        let isValid = !isBad; 

        for (const othermed of sched[i]) {
            const inter = getInteraction(currentmed, othermed);
            if (inter === -1) {
                if (!isBad) isCofactor = true;
            } else if (inter !== 0) {
                isValid = false;
            }
        }

        if (isCofactor) {
            pslots.push(i);
        } else if (isValid) {
            okslots.push(i);
        }
    }

    const newqueue = meds.slice(1);
    shuffle(pslots);
    shuffle(okslots);

    for (const p of pslots) {
        sched[p].push(currentmed);
        if (fillSchedule(newqueue, sched)) return true;
        sched[p].pop();
    }

    for (const p of okslots) {
        sched[p].push(currentmed);
        if (fillSchedule(newqueue, sched)) return true;
        sched[p].pop();
    }

    return false;
}

function getInteraction(med1, med2) {
    if (!data || !data.items || !data.matrix) return 0;
    const rxID1 = data.items.indexOf(med1);
    const rxID2 = data.items.indexOf(med2);
    if (rxID1 === -1 || rxID2 === -1) return 0;
    return data.matrix[rxID1][rxID2];
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function startup() {
    loadData();
    loadSupps();
    await loadJSON();
    calculateSchedule(supps, slots);
    loadCalendar();
}

function loadCalendar() {
    const lcol = document.getElementById("lcol");
    const mcol = document.getElementById("mcol");
    const rcol = document.getElementById("rcol");
    
    for (const elem of [lcol, mcol, rcol]) {
        if (elem) elem.innerHTML = "";
    }

    const now = new Date(); 
    now.setDate(now.getDate() + offset); 

    today = now.getDay();

    if (lcol) lcol.innerHTML = "<h6 id='lcolheader'></h6>";
    if (mcol) mcol.innerHTML = "<h6 id='mcolheader'></h6>";
    if (rcol) rcol.innerHTML = "<h6 id='rcolheader'></h6>";

    document.getElementById("lcolheader").innerHTML = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toLocaleDateString('en-US', { weekday: 'long', month: 'numeric', day: 'numeric' });
    document.getElementById("mcolheader").innerHTML = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toLocaleDateString('en-US', { weekday: 'long', month: 'numeric', day: 'numeric' });
    document.getElementById("rcolheader").innerHTML = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toLocaleDateString('en-US', { weekday: 'long', month: 'numeric', day: 'numeric' });

    let idx = 0;
    const meals = [" (Breakfast)", " (Lunch)", " (Dinner)"];
    for (const slot of slots) {
        if (mcol) {
            const mcolinner = timeToString(slot) + meals[idx] + "<br><br>" + medsToString(calendars[today * 3 + idx]);
            mcol.innerHTML += "<div class='card'> <p> " + mcolinner + " </p> </div>";
        }
        if (lcol) {
            const lcolinner = timeToString(slot) + meals[idx] + "<br><br>" + medsToString(calendars[(today * 3 - 3 + idx + calendars.length) % calendars.length]);
            lcol.innerHTML += "<div class='card'> <p> " + lcolinner + " </p> </div>";
        }
        if (rcol) {
            const rcolinner = timeToString(slot) + meals[idx] + "<br><br>" + medsToString(calendars[(today * 3 + 3 + idx) % calendars.length]);
            rcol.innerHTML += "<div class='card'> <p> " + rcolinner + " </p> </div>";
        }
        idx += 1;
    }
}

function timeToString(time) {
    let hrs = Math.floor(time);
    const mins = Math.floor((time - hrs) * 60);
    const period = hrs >= 12 ? "PM" : "AM";
    if (hrs > 12) hrs -= 12;
    if (hrs === 0) hrs = 12;
    return hrs + ":" + (mins < 10 ? "0" : "") + mins + period;
}

function medsToString(meds) {
    if (meds && meds.length > 0) {
        let stringle = "";
        for (const med of meds) {
            stringle += med + "<br>";
        }
        return stringle;
    }
    return "";
}

function populate() {
    const select = document.getElementById("medselect");
    if (!select || !data || !data.items) return;
    select.innerHTML = "<option value='' disabled selected hidden>Choose Medication</option>";
    for (const medication of data.items) {
        select.innerHTML += "<option value='" + medication + "'>" + medication + "</option>";
    } 
}

function addMed(med, num) {
    supps.push(new prescription(med, parseInt(num)));
    loadSupps();
    saveData();
}