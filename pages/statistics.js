const ITEMS = [

    { icon:"👁", label:"Open", action:"APP_OPEN" },

    { icon:"🔑", label:"Login", action:"LOGIN_SUCCESS" },

    { icon:"📍", label:"GPS Granted", action:"GPS_GRANTED" },

    { icon:"🚫", label:"GPS Denied", action:"GPS_DENIED" },

    { icon:"📤", label:"Share", action:"SHARE_CLICK" },

    { icon:"📲", label:"Install", action:"PWA_INSTALL" }

];



async function loadStatistics(){

    const from = new Date();

    from.setFullYear(
        from.getFullYear() - 1
    );


    const { data, error } = await supabase

        .from("statistics")

        .select("*")

        .gte(
            "created_at",
            from.toISOString()
        );


    if(error){

        console.error(
            "Statistics load error:",
            error
        );

        return [];

    }


    return data || [];

}





function filterPeriod(data, period){

    const now = new Date();


    return data.filter(item=>{

        const date = new Date(item.created_at);


        if(period==="today"){

            return date.toDateString()
                === now.toDateString();

        }


        if(period==="week"){

            const first =
                new Date(now);

            first.setDate(
                now.getDate() - 7
            );

            return date >= first;

        }


        if(period==="month"){

            return (
                date.getMonth()
                === now.getMonth()
                &&
                date.getFullYear()
                === now.getFullYear()
            );

        }


        if(period==="year"){

            return (
                date.getFullYear()
                === now.getFullYear()
            );

        }


        return false;

    });

}





function countAction(data, action){

    return data.filter(
        x=>x.action===action
    ).length;

}





function renderBlock(elementId, data){

    const box =
        document.getElementById(elementId);


    box.innerHTML="";


    ITEMS.forEach(item=>{


        const row =
        document.createElement("div");


        row.className="row";


        row.innerHTML=`

            <div class="label">
                ${item.icon}
                ${item.label}
            </div>

            <div class="value">
                ${countAction(data,item.action)}
            </div>

        `;


        box.appendChild(row);


    });


}





async function loadFooter(data){


    document
    .getElementById("totalRecords")
    .textContent=data.length;


    document
    .getElementById("dbStatus")
    .textContent="Online";


    const last =
        data.length
        ?
        new Date(data[0].created_at)
        :
        null;


    document
    .getElementById("lastUpdate")
    .textContent =
        last
        ?
        last.toLocaleString("it-IT")
        :
        "-";



}





async function init(){


    const data =
        await loadStatistics();



    renderBlock(
        "today",
        filterPeriod(data,"today")
    );


    renderBlock(
        "week",
        filterPeriod(data,"week")
    );


    renderBlock(
        "month",
        filterPeriod(data,"month")
    );


    renderBlock(
        "year",
        filterPeriod(data,"year")
    );


    await loadFooter(data);


}



init();
