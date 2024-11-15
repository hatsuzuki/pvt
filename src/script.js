$(document).ready(function()
{
    // required constants and variables

    const urlParams = new URLSearchParams(window.location.search); // get URL parameters
    const debugFlag = urlParams.get("debug") === "true" ? true : false; // flag to shorten test duration for debugging; call by including ?debug=true in URL

    const testDuration = debugFlag ? 0.3 : 3; // test duration minutes (default is 3 minutes; shortened to 0.3 minutes if debugFlag == true)

    const maxResponseTime = 1500; // time in ms to wait after light turns on before treating a failure to tap as a miss
    const minDelay = 2000; // min delay in ms before light turns on
    const maxDelay = 6000; // max delay in ms before light turns on
    const feedBackTime = 1000; // time in ms to show feedback text

    var isTestStarted = false; // flag to check whether test is started
    var isLightOn = false; // flag to check whether light is on

    var testStartTime; // timestamp of start of test
    var testStopTime; // timestamp of end of test

    var currentDateTime = ""; // current date and time in yyyy-mm-dd HH:MM:ss format
    var reactionTimesFull = []; // array of reaction times including false starts and misses
    var reactionTimes = []; // array of reaction times in ms (separate array to calculate average)
    var avgReactionTime = 0; // average reaction time
    var falseStarts = 0; // number of false starts (tap when light is not on)
    var misses = 0; // number of misses (no tap when light is on)
    
    var currentDelay = 0; // most recent time taken to tap after light turns on
    var lightShownTime; // most recent timestamp of light turning on
    var tapTime; // most recent timestamp of tap

    var lightTimeoutId; // id of setTimeOut for showLight()
    var missTimeoutId; // id of setTimeOut for missLight()
    var hideFeedbackId; // id of setTimeOut for hideFeedback()

    // formsg pre-fill IDs
    const formsg_formID = "670cea7b54678e1c5b20cdf8";
    const formsg_testStartTime = "670ceb3e5d41976927e3ac3e";
    const formsg_avgReactionTime = "670cee82e69649d8d43018d3";
    const formsg_falseStarts = "670ceeabde31f3432322a1c7";
    const formsg_misses = "670ceebd595272bb070eba3c";
    const formsg_reactionTimes = "67261a890895c76e497ac73c";


    // show tutorial modal on page load
    const tutorialModal = new bootstrap.Modal("#tutorialModal");
    tutorialModal.show();

    // show debug text in tap area on page load if debugFlag is true
    if (debugFlag)
    {
        $("#taparea > h4").html("DEBUG MODE");
    }

    // handler for user click on start button
    $("#start").click(function()
    {
        // hide start button and feedback text
        $("#start, #feedback").addClass("tw-hidden");

        // start test
        startTest()
    });

    // function to start test
    function startTest()
    {
        
        // set flag
        isTestStarted = true;
        
        // set testStartTime to current time;
        testStartTime = Date.now();
        
        // set currentDateTime to current time;
        currentDateTime = convertDate(new Date());
        console.log(`Test started on ${currentDateTime}.`);
        if (debugFlag) { console.log("Debug mode enabled.") }

        // light will only be shown at a random time between [minDelay] and [maxDelay] ms
        // to give user time to get ready and avoid light being shown rapidly in quick succession
        var lightDelay = parseInt(minDelay + Math.random()*(maxDelay - minDelay));

        // show light after lightDelay
        lightTimeoutId = setTimeout(showLight, lightDelay);
    }

    // function to stop test
    function stopTest()
    {
        // set flag
        isTestStarted = false;

        // clear timeouts to stop them from firing
        clearTimeout(lightTimeoutId);
        clearTimeout(missTimeoutId);
        clearTimeout(hideFeedbackId);

        testStopTime = Date.now(); // get current timestamp

        // hide light if visible
        $("#light").addClass("tw-hidden");
        $("#light").removeClass("tw-bg-rose-600 light-shadow");

        // show final feedback after delaying for a while
        setTimeout(showFinalFeedback, feedBackTime);

        // calculate average reaction time by reducing reactionTime array
        avgReactionTime = Math.round(reactionTimes.reduce((sum, currentValue) => sum + currentValue, 0) / reactionTimes.length);
        
        if (isNaN(avgReactionTime)) { avgReactionTime = 0; }

        // we want to output reactionTimesFull (includes "FS" and "MISS") instead of reactionTimes (includes numeric reaction times only)
        if (reactionTimesFull.length == 0) { reactionTimesFull = "NA"; }

        console.log(`Total test duration (s): ${Math.round((testStopTime - testStartTime) / 1000).toString()}`);
        console.log(`Average reaction time: ${avgReactionTime.toString()}`);
        console.log(`Number of false starts: ${falseStarts.toString()}`);
        console.log(`Number of misses: ${misses.toString()}`);
        console.log(`Reaction times: ${reactionTimesFull.toString()}`);
        console.log(`Test concluded at ${convertDate(new Date())}.`);

        // update results in results modal
        $("#reaction-times-length").html(reactionTimes == "[]" ? 0 : reactionTimes.length); // successful taps only
        $("#avg-reaction-time").html(avgReactionTime);
        $("#false-starts").html(falseStarts);
        $("#misses").html(misses);

        // set formSG submission link in results modal
        var submissionLink = `https://form.gov.sg/${formsg_formID}?${formsg_testStartTime}=${debugFlag ? currentDateTime + " (DEBUG)" : currentDateTime}&${formsg_avgReactionTime}=${avgReactionTime}&${formsg_falseStarts}=${falseStarts}&${formsg_misses}=${misses}&${formsg_reactionTimes}=${reactionTimesFull.toString()}`;
        $("#submit").attr("href", encodeURI(submissionLink));

        // show results modal
        const resultsModal = new bootstrap.Modal("#resultsModal",
        {
            backdrop: "static",
            keyboard: false
        });
        setTimeout(() => resultsModal.show(), 1000);
    }

    // function to display the indicator light
    function showLight()
    {
        // physically show light
        $("#light").removeClass("tw-hidden");
        $("#light").addClass("tw-bg-rose-600 light-shadow");
        
        // set flag to true
        isLightOn = true;

        // set lightShownTime to current time
        lightShownTime = Date.now();

        // set timer for missing the light
        missTimeoutId = setTimeout(missLight, maxResponseTime);
    }

    // handler for when user misses the light
    function missLight() // user waited for too long and missed the light
    {
        // increment misses
        misses += 1;
        
        // push result to array
        reactionTimesFull.push("MISS");
        
        // show feedback
        showFeedback("MISS");
        console.log(`Miss! Total misses: ${misses}`);

        resetLight();
    }

    // function to reset the indicator light and prime it to reappear again
    function resetLight()
    {
        // stop light from showing
        clearTimeout(lightTimeoutId);

        // stop missLight from firing
        clearTimeout(missTimeoutId);

        // physically hide light
        $("#light").addClass("tw-hidden");
        $("#light").removeClass("tw-bg-rose-600 light-shadow");

        // set flag to false
        isLightOn = false;
        
        // check if current time is > [testDuration] minutes past testStartTime; if so, end test
        if (getCurrentTime() - testStartTime >= testDuration * 60 * 1000)
        {
            // end test
            stopTest();
            return;
        }

        else // else show the next light
        {
            // light will only be shown at a random time between [minDelay] and [maxDelay] ms
            // to give user time to get ready and avoid light being shown rapidly in quick succession
            var lightDelay = parseInt(minDelay + Math.random()*(maxDelay - minDelay));

            // show light after lightDelay
            lightTimeoutId = setTimeout(showLight, lightDelay);
        }
    }

    // handler for user click in #taparea
    $("#taparea").click(function(e)
    {
        // prevent default functionality (e.g. highlighting)
        e.preventDefault();

        // get current time when #taparea was clicked
        tapTime = getCurrentTime();

        // stop missLight from firing
        clearTimeout(missTimeoutId);

        // do nothing if test is not started
        if (!isTestStarted)
        {
            return;
        }

        // do nothing if #feedback is currently visible
        if (!$("#feedback").hasClass("tw-hidden"))
        {
            return;
        }

        if (isLightOn) // user tapped when light is on = positive hit
        {
            tapTime = getCurrentTime(); // setTapTime to current time
            currentDelay = tapTime - lightShownTime; // calculate time in ms taken to tap after light is shown
            
            // push result to arrays
            reactionTimes.push(currentDelay);
            reactionTimesFull.push(currentDelay);

            // show feedback
            showFeedback(currentDelay);
            console.log(currentDelay);

            // reset light
            resetLight();
        }

        else // user tapped when light is not on = false start
        {
            // increment falseStarts
            falseStarts += 1;

            // push result to array
            reactionTimesFull.push("FS");

            // show feedback
            showFeedback("FS");
            console.log(`False start! Total false starts: ${falseStarts}`);

            // reset light
            resetLight();
        }
    });

    // helper function to get current date and time as a unix timestamp
    function getCurrentTime()
    {
        return Date.now();
    }

    // helper function to unhide #feedback and show text before hiding it again after [feedBackTime] ms
    // if hideAgain is false, do not hide it again
    function showFeedback(text, hideAgain = true)
    {
        $("#feedback").removeClass("tw-hidden");
        $("#feedback").html(text);

        if (hideAgain)
        {
            hideFeedbackId = setTimeout(hideFeedback, feedBackTime);
        }
    }

    // helper function to hide #feedback
    function hideFeedback()
    {
        $("#feedback").addClass("tw-hidden");
        $("#feedback").html("");
    }

    // helper function to show final feedback without re-hiding it
    function showFinalFeedback()
    {
        showFeedback("DONE", false);
    }

    // helper function to convert a Date object to a string in yyyy-mm-dd HH:MM:ss format
    function convertDate(date)
    {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2,"0")}-${date.getDate().toString().padStart(2,"0")} ${date.getHours().toString().padStart(2,"0")}:${date.getMinutes().toString().padStart(2,"0")}:${date.getSeconds().toString().padStart(2,"0")}`;
    }

});
