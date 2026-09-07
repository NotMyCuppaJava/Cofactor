let factors = {};

function partition_seven(n){
    output = Array(7).fill(0)
    jump = 7 / n
    for(i=0;i<n;i++){
        output[Math.trunc(i * jump)] += 1
    }
    return output
}

async function loadJSON() {
    try {
        const response = await fetch("./interaction_matrix.json");
        factors = await response.json();
        console.log("JSON Data:", factors);
    } catch (error) {
        console.error("Error loading JSON:", error);
    }   
}

function getFactor(suppA, suppB){
    if (typeof suppA !== 'string') console.log("suppA is weird:", suppA);
    if (typeof suppB !== 'string') console.log("suppB is weird:", suppB);

    if (typeof suppA !== 'string' || typeof suppB !== 'string') return 0;

    substance_a = suppA.toLowerCase()
    substance_b = suppB.toLowerCase()

    try{
        return factors[substance_a][substance_b] ?? 0
    } catch{
        return 0
    }  
}

function daysFromMeds(meds){
    calendar = Array.from({length: 7}, () => []);

    for (med of meds) {
        // Step 1: Construct the array that gets glued on to the other one
        augment = Array.from({length: 7}, () => []);
        no = med[1]
        supp = med[0]

        x = partition_seven(no)

        for(idx=0;idx<7;idx++){
            augment[idx] = [...augment[idx], ...Array(x[idx]).fill(supp)]
        }

        bestidx = 0
        bestscore = Infinity

        // Step 2: Find the best shift to place the new augmentation on
        for(let i=0;i<7;i++){
            inconvenience = 0
            for(let j=0;j<7;j++){
                issue = 0
                for(item of calendar[j]){
                  issue += getFactor(supp, item)
                }
                inconvenience += issue * augment[(j - i + 7) % 7].length
            }
            if (inconvenience < bestscore){
              bestscore = inconvenience
              bestidx = i
            }
        }

        // Step 3: Actually tack it on
        augment = [...augment.slice(bestidx), ...augment.slice(0, bestidx)]
        for (i=0;i<7;i++){
            calendar[i] = [...calendar[i], ...augment[i]]
        }
    }
    return calendar
}

function fillDay(medications, slots){
  daySchedule = {}
  for(slot of slots){
    daySchedule[slot] = []
  }
  [s, sch] = populateSlots(daySchedule, medications, slots)
  return sch
}

function populateSlots(currentDay, medications, slots){
    if (medications.length == 0) {
        return [scoreDay(currentDay), structuredClone(currentDay)]
    }

    let best_score = -Infinity
    let best_schedule = null
    let current = medications[0]

    for (let key in currentDay){
        currentDay[key].push(current)

        let [score, schedule] = populateSlots(currentDay, medications.slice(1), slots)

        currentDay[key].pop()

        if(score > best_score){
            best_score = score
            best_schedule = schedule
        }
    }
    return [best_score, best_schedule]
}

function scoreDay(currentDay){
    let score = 0
    converted = []
    for(key in currentDay){
        for(item of currentDay[key]){
            converted.push([item, key])
        }
    }
    // The above converts the dictionary into a more readable format:
    // (Iron, 5), (Calcium, 6), (Blah, 12)

    for(let i=0;i<converted.length;i++){
        let current = 1
        for(let j=0;j<converted.length;j++){
            if(i==j){
                continue
            }else{
                current *= (1 - getFactor(converted[i][0], converted[j][0]) * Math.exp(0 - Math.abs(converted[i][1] - converted[j][1]) * 0.9))
            }
        }
        score += current / converted.length
    }

    return score
}

function generateSchedule(slots, meds){
    actual = []
    // slots = [6, 7, 8, 22]
    // meds = [("Iron", 7), ("Calcium", 5), ("Vitamin C", 3)]


    calendar = daysFromMeds(meds)

    for (day of calendar){
        actual.push(fillDay(day, slots))
    }

    for (row of actual){
        console.log(row)
    }
}