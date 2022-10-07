/* ----------------- Internal Functions ----------------- */
function get_results(illusion_mean, illusion_sd, illusion_type) {
    if (typeof illusion_type != "undefined") {
        var trials = jsPsych.data
            .get()
            .filter({ screen: "Trial", type: illusion_type }) // results by block
    } else {
        var trials = jsPsych.data.get().filter({ screen: "Trial" }) // overall results
    }
    var correct_trials = trials.filter({ correct: true })
    var proportion_correct = correct_trials.count() / trials.count()
    var rt_mean = trials.select("rt").mean()
    if (correct_trials.count() > 0) {
        var rt_mean_correct = correct_trials.select("rt").mean()
        var ies = rt_mean_correct / proportion_correct // compute inverse efficiency score
        var score_to_display = 100 - ies / 50
        if (score_to_display < 0) {
            score_to_display = 0
        }
        var percentile =
            100 - cumulative_probability(ies, illusion_mean, illusion_sd) * 100
    } else {
        var rt_mean_correct = ""
        var ies = ""
        var percentile = 0
        var score_to_display = 0
    }
    return {
        accuracy: proportion_correct,
        mean_reaction_time: rt_mean,
        mean_reaction_time_correct: rt_mean_correct,
        inverse_efficiency: ies,
        percentage: percentile,
        score: score_to_display,
    }
}

function get_debrief_display(results, type = "Block") {
    if (type === "Block") {
        // Debrief at end of each block
        var score =
            "<p>Your score for this illusion is " +
            '<p style="color: black; font-size: 48px; font-weight: bold;">' +
            Math.round(results.score * 10) / 10 +
            " %</p>"
    } else if (type === "Final") {
        // Final debriefing at end of game
        var score =
            "<p><strong>Your final score is</strong> " +
            '<p style="color: black; font-size: 48px; font-weight: bold;">&#127881; ' +
            Math.round(results.score) +
            " &#127881;</p>"
    }

    return {
        display_score: score,
        display_accuracy:
            "<p style='color:rgb(76,175,80);'>You responded correctly on <b>" +
            round_digits(results.accuracy * 100) +
            "" +
            "%</b> of the trials.</p>",
        display_rt:
            "<p style='color:rgb(233,30,99);'>Your average response time was <b>" +
            round_digits(results.mean_reaction_time) +
            "</b> ms.</p>",
        display_comparison:
            "<p style='color:rgb(76,175,80);'>You performed better than <b>" +
            round_digits(results.percentage) +
            "</b>% of the population.</p>",
    }
}

// Set fixation cross to jitter
var fix_cross = ["+", " +", "+ ", "\n+", "+\n", "\n +", "\n+ ", " +\n", "+ \n"]

// Function to pick an element randomly from an array
function random_item(items){
    return items[Math.floor(Math.random()*items.length)];
}

function randomize_fixation(){
    var fixation = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: function(){
            var cross = random_item(fix_cross)
            return '<p style="color: black; font-size: 60px;">' + cross + "</p>"
            //jsPsych.timelineVariable("fixCross") +
           // fix_cross[randomInteger(0, fix_cross.length-1)] +
          // "</p>",
        },
        choices: "NO_KEYS" /* no responses will be accepted as a valid response */,
        //trial_duration: 0, // (for testing)
        trial_duration: function () {
            return randomInteger(500, 1000) // Function from RealityBending/JSmisc
        },
        save_trial_parameters: {
            trial_duration: true,
        },
        data: { screen: "fixation" },
    }
    return fixation
}

// Break
var make_break1 = {
    type: jsPsychHtmlButtonResponse,
    choices: ["I am ready to continue!"],
    stimulus:
        "<p><b>CONGRATULATIONS!</b></p>" +
        "<p>You have finished half of the game. We know it's long and challenging, so we appreciate you staying focused until the end!</p>" +
        "<p>Before you see all the illusions once again, let's take a break by answering a few questions about yourself.</p>",
    save_trial_parameters: {
        trial_duration: true,
    },
    data: { screen: "break1" },
}
var make_break2 = {
    type: jsPsychHtmlButtonResponse,
    choices: ["I am ready to continue!"],
    stimulus:
        "<p><b>Back to the illusions</b></p>" +
        "<p>Try to improve your previous score!</p>",
    save_trial_parameters: {
        trial_duration: true,
    },
    data: { screen: "break2" },
}

// Marker
var marker_position = [0, 0, 0, 0] // [0, 0, 100, 100]
function create_marker(marker_position, color = "black") {
    const html = `<div id="marker" style="position: absolute; background-color: ${color};\
    left:${marker_position[0]}; top:${marker_position[1]}; \
    width:${marker_position[2]}px; height:${marker_position[3]}px";></div>`
    document.querySelector("body").insertAdjacentHTML("beforeend", html)
}

// Trial
function create_trial(illusion_name = "Ponzo", type = "updown") {
    if (type == "updown") {
        var trial = {
            type: jsPsychImageKeyboardResponse,
            stimulus: jsPsych.timelineVariable("stimulus"),
            choices: ["arrowup", "arrowdown"],
            data: jsPsych.timelineVariable("data"),
            on_load: function () {
                create_marker(marker_position)
            },
            on_finish: function (data) {
                document.querySelector("#marker").remove()
                data.prestimulus_duration =
                    jsPsych.data.get().last(2).values()[0].time_elapsed -
                    jsPsych.data.get().last(3).values()[0].time_elapsed
                // Score the response as correct or incorrect.
                if (data.response != -1) {
                    if (
                        jsPsych.pluginAPI.compareKeys(
                            data.response,
                            data.correct_response
                        )
                    ) {
                        data.correct = true
                    } else {
                        data.correct = false
                    }
                } else {
                    // code mouse clicks as correct or wrong
                    if (data.click_x < window.innerHeight / 2) {
                        // use window.innerHeight for up vs down presses
                        data.response = "arrowdown"
                    } else {
                        data.response = "arrowup"
                    }
                    if (
                        jsPsych.pluginAPI.compareKeys(
                            data.response,
                            data.correct_response
                        )
                    ) {
                        data.correct = true
                    } else {
                        data.correct = false
                    }
                }
                // track block and trial numbers
                data.type = illusion_name
                data.illusion_strength =
                    jsPsych.timelineVariable("Illusion_Strength")
                data.illusion_difference =
                    jsPsych.timelineVariable("Difference")
                data.block_number = block_number
                data.trial_number = trial_number
                trial_number += 1
            },
        }
    } else {
        var trial = {
            type: jsPsychImageKeyboardResponse,
            stimulus: jsPsych.timelineVariable("stimulus"),
            choices: ["arrowleft", "arrowright"],
            data: jsPsych.timelineVariable("data"),
            on_load: function () {
                create_marker(marker_position)
            },
            on_finish: function (data) {
                document.querySelector("#marker").remove()
                data.prestimulus_duration =
                    jsPsych.data.get().last(2).values()[0].time_elapsed -
                    jsPsych.data.get().last(3).values()[0].time_elapsed
                // Score the response as correct or incorrect.
                if (data.response != -1) {
                    if (
                        jsPsych.pluginAPI.compareKeys(
                            data.response,
                            data.correct_response
                        )
                    ) {
                        data.correct = true
                    } else {
                        data.correct = false
                    }
                } else {
                    // code mouse clicks as correct or wrong
                    if (data.click_x < window.innerWidth / 2) {
                        // use window.innerHeight for up vs down presses
                        data.response = "arrowleft"
                    } else {
                        data.response = "arrowright"
                    }
                    if (
                        jsPsych.pluginAPI.compareKeys(
                            data.response,
                            data.correct_response
                        )
                    ) {
                        data.correct = true
                    } else {
                        data.correct = false
                    }
                }
                // track block and trial numbers
                data.type = illusion_name
                data.illusion_strength =
                    jsPsych.timelineVariable("Illusion_Strength")
                data.illusion_difference =
                    jsPsych.timelineVariable("Difference")
                data.block_number = block_number
                data.trial_number = trial_number
                trial_number += 1
            },
        }
    }
    return trial
}

// Debrief
function create_debrief(illusion_name = "Ponzo") {
    var debrief = {
        type: jsPsychHtmlButtonResponse,
        choices: ["Continue"],
        on_start: function () {
            ;(document.body.style.cursor = "auto"),
                (document.querySelector(
                    "#jspsych-progressbar-container"
                ).style.display = "inline")
        },
        stimulus: function () {
            var results = get_results(
                1000, // population_scores[illusion_name]["IES_Mean"][0],
                400, // population_scores[illusion_name]["IES_SD"][0],
                illusion_name
            )
            var show_screen = get_debrief_display(results)
            return (
                show_screen.display_score +
                // "<hr>" +
                // // For debugging purposes, show the raw data.
                // show_screen.display_accuracy +
                // "<hr>" +
                // show_screen.display_rt +
                // "<hr>" +
                // //
                // show_screen.display_comparison +
                "<hr><p>Can you do better in the next illusion?</p>"
            )
        },
        data: { screen: "block_results" },
        // Reset trial number and update block number
        on_finish: function () {
            block_number += 1
            trial_number = 1
        },
    }
    return debrief
}

// Debrief
function make_trial(stimuli, instructions, illusion_name, type) {
    var timeline = []

    // Set stimuli (var stimuli is loaded in stimuli/stimuli.js)
    var stim_list = stimuli.filter(
        (stimuli) => stimuli.Illusion_Type === illusion_name
    )

    // Preload images
    timeline.push({
        type: jsPsychPreload,
        images: stim_list.map((a) => a.stimulus),
    })

    // Instructions
    timeline.push({
        type: jsPsychHtmlKeyboardResponse,
        on_start: function () {
            ;(document.body.style.cursor = "none"),
                (document.querySelector(
                    "#jspsych-progressbar-container"
                ).style.display = "none")
        },
        choices: ["enter"],
        stimulus: instructions,
        post_trial_gap: 500,
    })

    // Define trial
    var trial = create_trial(illusion_name, (type = type))

    // Define fixation
    var randFix = randomize_fixation()

    // Create Trials timeline
    timeline.push({
        timeline: [randFix, trial],
        timeline_variables: stim_list,
        randomize_order: true,
        repetitions: 1,
    })

    // Debriefing Information
    if (stimuli != stimuli_training) {
        timeline.push(create_debrief((illusion_name = illusion_name)))
    } else if ((stimuli = stimuli_training)) {
        timeline.push({
            type: jsPsychHtmlButtonResponse,
            choices: ["Continue"],
            post_trial_gap: 500,
            on_start: function () {
                ;(document.body.style.cursor = "auto"),
                    (document.querySelector(
                        "#jspsych-progressbar-container"
                    ).style.display = "inline")
            },
            stimulus: "<p><b>Great job!</b></p>",
            data: { screen: "practice_block" },
        })
    }
    return timeline
}

// Instructions for Illusion Trials

const mullerlyer_instructions =
    "<p>In this part, two horizontal red lines will appear one above the other.</p>" +
    "<p>Your task is to select which <b>line is longer</b> in length as fast as you can, without making errors.</p>" +
    "<p>Don't get distracted by the surrounding black arrows at the end of the red lines!</p>" +
    "<p>Press <b>the UP or the DOWN arrow</b> to indicate where is the longer <b>red line.</b></p>" +
    "<div style='float: center'><img src='materials/instructions/MullerLyer_Demo.png' height='300'></img>" +
    "<p><img src='utils/answer/answer_updown_keyboard.PNG' height='150'></img></p>" +
    "<p class='small'>In this example, the correct answer is the <b>UP arrow</b>.</p></div>" +
    "<p>Are you ready? <b>Press ENTER to start</b></p>"

const ebbinghaus_instructions =
    "<p>In this part, two red circles will appear side by side on the screen.</p>" +
    "<p>Your task is to select which <b>red circle is bigger</b> in size as fast as you can, without making errors.</p>" +
    "<p>Don't get distracted by the surrounding black circles around the red circles!</p>" +
    "<p>Press <b>the LEFT or the RIGHT arrow</b> to indicate which is the bigger <b>red circle.</b></p>" +
    "<div style='float: center'><img src='materials/instructions/Ebbinghaus_Demo.png' height='300'></img>" +
    "<p><img src='utils/answer/answer_leftright_keyboard.PNG' height='150'></img></p>" +
    "<p class='small'>In this example, the correct answer is the <b>LEFT arrow</b>.</p></div>" +
    "<p>Are you ready? <b>Press ENTER to start</b></p>"

const verticalhorizontal_instructions =
    "<p>In this part, two red lines will appear side by side.</p>" +
    "<p>Your task is to tell <b>which line is longer</b> in length as fast as you can, and without making errors.</p>" +
    "<p>Don't get distracted by the orientation of the lines!</p>" +
    "<p>Press <b>the LEFT or the RIGHT arrow</b> to indicate which <b>line is the longer one.</b></p>" +
    "<div style='float: center'><img src='materials/instructions/VerticalHorizontal_Demo.png' height='300'></img>" +
    "<p><img src='utils/answer/answer_leftright_keyboard.PNG' height='150'></img></p>" +
    "<p class='small'>In this example, the correct answer is the <b>LEFT arrow</b>.</p></div>" +
    "<p>Are you ready? <b>Press ENTER to start</b></p>"

// Instructions for Perceptual Trials

const mullerlyer_instructions_perceptual =
    "<p>In this part, two horizontal red lines will appear one above the other.</p>" +
    "<p>Your task is to select which <b>line is longer</b> in length as fast as you can, without making errors.</p>" +
    "<p>Press <b>the UP or the DOWN arrow</b> to indicate where is the longer <b>red line.</b></p>" +
    "<div style='float: center'><img src='materials/instructions/MullerLyer_DemoPerceptual.png' height='300'></img>" +
    "<p><img src='utils/answer/answer_updown_keyboard.PNG' height='150'></img></p>" +
    "<p class='small'>In this example, the correct answer is the <b>UP arrow</b>.</p></div>" +
    "<p>Are you ready? <b>Press ENTER to start</b></p>"

const ebbinghaus_instructions_perceptual =
    "<p>In this part, two red circles will appear side by side on the screen.</p>" +
    "<p>Your task is to select which <b>red circle is bigger</b> in size as fast as you can, without making errors.</p>" +
    "<p>Press <b>the LEFT or the RIGHT arrow</b> to indicate which is the bigger <b>red circle.</b></p>" +
    "<div style='float: center'><img src='materials/instructions/Ebbinghaus_DemoPerceptual.png' height='300'></img>" +
    "<p><img src='utils/answer/answer_leftright_keyboard.PNG' height='150'></img></p>" +
    "<p class='small'>In this example, the correct answer is the <b>LEFT arrow</b>.</p></div>" +
    "<p>Are you ready? <b>Press ENTER to start</b></p>"

const verticalhorizontal_instructions_perceptual =
    "<p>In this part, two red lines will appear side by side.</p>" +
    "<p>Your task is to tell <b>which line is longer</b> in length as fast as you can, and without making errors.</p>" +
    "<p>Press <b>the LEFT or the RIGHT arrow</b> to indicate which <b>line is the longer one.</b></p>" +
    "<div style='float: center'><img src='materials/instructions/VerticalHorizontal_DemoPerceptual.png' height='300'></img>" +
    "<p><img src='utils/answer/answer_leftright_keyboard.PNG' height='150'></img></p>" +
    "<p class='small'>In this example, the correct answer is the <b>LEFT arrow</b>.</p></div>" +
    "<p>Are you ready? <b>Press ENTER to start</b></p>"

/* Psychometric scales---------------------------------------------------------------------*/

// Mini IPIP scale
var IPIP = [
    "<b>I am the life of the party</b><br>",
    "<b>I sympathize with others' feelings</b><br>",
    "<b>I get chores done right away</b><br>",
    "<b>I have frequent mood swings</b><br>",
    "<b>I have a vivid imagination</b><br>",
    "<b>I feel entitled to more of everything</b><br>",
    "<b>I do not talk a lot</b><br>",
    "<b>I am not interested in other people's problems</b><br>",
    "<b>I have difficulty understanding abstract ideas</b><br>",
    "<b>I like order</b><br>",
    "<b>I make a mess of things</b><br>",
    "<b>I deserve more things in life</b><br>",
    "<b>I do not have a good imagination</b><br>",
    "<b>I feel other's emotions</b><br>",
    "<b>I am relaxed most of the time</b><br>",
    "<b>I get upset easily</b><br>",
    "<b>I seldom feel blue</b><br>",
    "<b>I would like to be seen driving around in a very expensive car</b><br>",
    "<b>I keep in the background</b><br>",
    "<b>I am not really interested in others</b><br>",
    "<b>I am not interested in abstract ideas</b><br>",
    "<b>I often forget to put things back in their proper place</b><br>",
    "<b>I talk to a lot of different people at parties</b><br>",
    "<b>I would get a lot of pleasure from owning expensive luxury goods</b><br>",
]

var IPIP_dim = [
    "Extraversion_1",
    "Agreeableness_2",
    "Conscientiousness_3",
    "Neuroticism_4",
    "Openness_5",
    "HonestyHumility_6_R",
    "Extraversion_7_R",
    "Agreeableness_8_R",
    "Openness_9_R",
    "Conscientiousness_10",
    "Conscientiousness_11_R",
    "HonestyHumility_12_R",
    "Openness_13_R",
    "Agreeableness_14",
    "Neuroticism_15_R",
    "Neuroticism_16",
    "Neuroticism_17_R",
    "HonestyHumility_18_R",
    "Extraversion_19_R",
    "Agreeableness_20_R",
    "Openness_21_R",
    "Conscientiousness_22_R",
    "Extraversion_23",
    "HonestyHumility_24_R",
]

var PID = [
    "<b>People would describe me as reckless</b><br>",
    "<b>I feel like I act totally on impulse</b><br>",
    "<b>Even though I know better, I can't stop making rash decisions</b><br>",
    "<b>I often feel like nothing I do really matters</b><br>",
    "<b>Others see me as irresponsible</b><br>",
    "<b>I'm not good at planning ahead</b><br>",
    "<b>My thoughts often don't make sense to others</b><br>",
    "<b>I worry about almost everything</b><br>",
    "<b>I get emotional easily, often for very little reason</b><br>",
    "<b>I fear being alone in life more than anything else</b><br>",
    "<b>I get stuck on one way of doing things,even when it's clear it won't work</b><br>",
    "<b>I have seen things that weren't really there</b><br>",
    "<b>I steer clear of romantic relationships</b><br>",
    "<b>I'm not interested in making friends</b><br>",
    "<b>I get irritated easily by all sorts of things</b><br>",
    "<b>I don't like to get too close to people</b><br>",
    "<b>It's no big deal if I hurt other people's feelings</b><br>",
    "<b>I rarely get enthusiastic about anything</b><br>",
    "<b>I crave attention</b><br>",
    "<b>I often have to deal with people who are less important than me</b><br>",
    "<b>I often have thoughts that make sense to me but that other people say are strange</b><br>",
    "<b>I use people to get what I want</b><br>",
    "<b>I often 'zone out' and then suddenly come to and realize that a lot of time has passed</b><br>",
    "<b>Things around me often feel unreal, or more real than usual</b><br>",
    "<b>It is easy for me to take advantage of others</b><br>",
]

var PID_dim = [
    "Disinhibition_1",
    "Disinhibition_2",
    "Disinhibition_3",
    "Detachment_4",
    "Disinhibition_5",
    "Disinhibition_6",
    "Psychoticism_7",
    "NegativeAffect_8",
    "NegativeAffect_9",
    "NegativeAffect_10",
    "NegativeAffect_11",
    "Psychoticism_12",
    "Detachment_13",
    "Detachment_14",
    "NegativeAffect_15",
    "Detachment_16",
    "Antagonism_17",
    "Detachment_18",
    "Antagonism_19",
    "Antagonism_20",
    "Psychoticism_21",
    "Antagonism_22",
    "Psychoticism_23",
    "Psychoticism_24",
    "Antagonism_25",
]
