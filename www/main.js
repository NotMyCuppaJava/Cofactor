let data;
let sampleData;
let supps = [];
let slots = [7.5, 12, 20];
let calendars = [];
let today = 0;
let offset = 0;

class prescription {
    constructor (medication, daysperweek) {
        this.medication = medication
        this.dpw = daysperweek
    }
}

class timeStamp {
    constructor (day, hour, medication) {
        this.day = day
        this.hour = hour
        this.medication = medication
    }
}

function loadData() {
    const data = localStorage.getItem('info');
    if (!data) {
        console.log("DATA NOT THERE;"); 
        return
    }
    const info = JSON.parse(data);
    // Supplements
    const temp = info.meds
    for (med of temp) {
        supps.push(new prescription(med[0], med[1]))
    }
    // Slots
    slots = info.slots
    console.log("DATA LOADED!")
}

function saveData() {
    localStorage.setItem('info',JSON.stringify({
        slots: slots,
        meds: supps.map(med => [med.medication, med.dpw])
    }));
    console.log("DATA SAVED!")
}

async function loadJSON() {
    try {
        const response = await fetch("./interaction_matrix.json");
        data = await response.json();
        console.log(data);
    } catch (error) {
        console.error("Error loading JSON:", error);
    }   
    try{
        populate()
    }catch{}
}

function loadSupps(){
    if (supps.length == 0){
        supps = [
            new prescription("Iron", 2),
            new prescription("Folate", 3),
            new prescription("Zinc", 2),
            new prescription("Potassium", 1),
            new prescription("Vitamin D3", 1),
            // new prescription("Calcium", 7),
            new prescription("Magnesium", 4),
            new prescription("Vitamin B12", 3),
            new prescription("Omeprazole", 7)
        ];
    }
    
    const rackbody = document.getElementById("rackbodyx")
    rackbody.innerHTML = ""
    for (med of supps){
        const suppdiv = document.createElement("div")
        suppdiv.className = "supplement"
        const supptext = document.createElement("p")
        supptext.innerHTML = med.medication + "<br><br> (" + med.dpw + "/week)"
        suppdiv.appendChild(supptext)
        rackbody.appendChild(suppdiv)
    }
}

function calculateSchedule(medic, slotz) {
    // const medications = [
    //     new prescription("Iron", 2), 
    //     new prescription("Folate", 3),
    //     new prescription("Zinc", 2), 
    //     new prescription("Potassium", 1)
    // ];
    medications = [
        new prescription("Iron", 2),
        new prescription("Folate", 3),
        new prescription("Zinc", 2),
        new prescription("Potassium", 1),
        new prescription("Vitamin D3", 1),
        // new prescription("Calcium", 7),
        new prescription("Magnesium", 4),
        new prescription("Vitamin B12", 3),
        new prescription("Omeprazole", 7)
    ];

    const schedule = [];
    for (let i = 0; i < 7 * slots.length; i++) {
        schedule.push([]);
    }

    const queue = [];
    for (const med of medications) {
        for (let i = 0; i < med.dpw; i++) {
            queue.push(med);
        }
    }

    fillSchedule(queue, schedule);
    calendars = schedule
    return schedule;
}

function fillSchedule(meds, sched) {
    console.log("FILLING...")

    if (meds.length === 0) {
        return true;
    }

    const currentmed = meds[0].medication;
    const qcm = meds[0].dpw;
    const badslots = new Set();
    const pslots = [];
    const okslots = [];

    const minbar = Math.floor(sched.length / qcm);

    // Flag slots within minbar distance of existing same medication
    for (let i = 0; i < sched.length; i++) {
        if (sched[i].includes(currentmed)) {
            for (let j = -minbar + 1; j < minbar; j++) {
                const r = ((i + j) % sched.length + sched.length) % sched.length;
                badslots.add(r);
            }
        }
    }

    // Evaluate valid vs cofactor slots
    for (let i = 0; i < sched.length; i++) {
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

    const newqueue = [...meds];
    newqueue.shift();
    shuffle(pslots)
    shuffle(okslots)

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
    const rxID1 = data.items.indexOf(med1);
    const rxID2 = data.items.indexOf(med2);
    return data.matrix[rxID1][rxID2];
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


async function startup(){
    // await loadData(); 
    await loadJSON();
    await calculateSchedule(null, slots)
    loadCalendar()
}

function loadCalendar(){
    console.log("LOADING CALENDAR...")
     // Day of the week. 0 is sunday, 1 is monday, 6 is saturday
    const lcol = document.getElementById("lcol")
    const mcol = document.getElementById("mcol")
    const rcol = document.getElementById("rcol")
    
    for (elem of [lcol,mcol,rcol]){
        elem.innerHTML = ""
    }

    const now = new Date(); 
    now.setDate(now.getDate() + offset); 

    today = now.getDay();
    console.log("GOT TODAY", today)

    document.getElementById("lcol").innerHTML = "<h6 id = 'lcolheader'> Monday 8/7 </h6>"
    document.getElementById("mcol").innerHTML = "<h6 id = 'mcolheader'> Monday 8/7 </h6>"
    document.getElementById("rcol").innerHTML = "<h6 id = 'rcolheader'> Monday 8/7 </h6>"




    document.getElementById("lcolheader").innerHTML = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toLocaleDateString('en-US', { weekday: 'long', month: 'numeric', day: 'numeric' });
    document.getElementById("mcolheader").innerHTML = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toLocaleDateString('en-US', { weekday: 'long', month: 'numeric', day: 'numeric' });
    document.getElementById("rcolheader").innerHTML = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toLocaleDateString('en-US', { weekday: 'long', month: 'numeric', day: 'numeric' });
    console.log("LOADING DATE...")
    console.log(document.getElementById("lcolheader").innerHTML)

    var idx = 0
    for(slot of slots){
        console.log("IDX:", idx)
        mcolinner = timeToString(slot) + "<br><br>" + medsToString(calendars[today * 3 + idx])
        mcoln = "<div class = 'card'> <p> " + mcolinner + " </p> </div>" 
        mcol.innerHTML += mcoln     
        lcolinner = timeToString(slot) + "<br><br>" + medsToString(calendars[(today * 3 - 3 + idx + calendars.length) % calendars.length])
        lcoln = "<div class = 'card'> <p> " + lcolinner + " </p> </div>" 
        lcol.innerHTML += lcoln     
        rcolinner = timeToString(slot) + "<br><br>" + medsToString(calendars[(today * 3 + 3 + idx) % calendars.length])
        rcoln = "<div class = 'card'> <p> " + rcolinner + " </p> </div>" 
        rcol.innerHTML += rcoln     
        idx += 1       
    }
}

function timeToString(time){
    hrs = Math.floor(time)
    mins = Math.floor((time - hrs) * 60)
    if (hrs > 12){
        hrs -= 12
        return hrs + ":" + (mins < 10 ? "0" : "") + mins + "PM"
    }
    else{
        return hrs + ":" + (mins < 10 ? "0" : "") + mins + "AM"
    }
}

function medsToString(meds){
    if (meds){
        stringle = ""
        for (med of meds){
            stringle += med
            stringle += "<br>"
        }
        return stringle
    }
}

function populate(){
    console.log("loading select")
    const select = document.getElementById("medselect")
    select.innerHTML = "<option value='' disabled selected hidden>Choose Medication</option>"
    for (medication of data.items){
        select.innerHTML += "<option value='" + medication + "'>" + medication + "</option>"
    } 
}

function addMed(med, num){
    supps.push(
        new prescription(med, parseInt(num))
    )
    loadSupps()
    saveData()
}