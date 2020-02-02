import fetchJsonp from 'fetch-jsonp';
import 'regenerator-runtime/runtime';
import Chart, { ChartDataSets, ChartData } from 'chart.js';

function createCanvas(): CanvasRenderingContext2D {
    let canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d');

    document.querySelector('#main')?.appendChild(canvas);

    if (null == ctx) {
        throw new Error("ctx is null");
    }

    return ctx;
}

async function fetchCnData() {
    let resp = await fetchJsonp("https://interface.sina.cn/news/wap/fymap2020_data.d.json"),
        json = await resp.json();

    return json.data.historylist.reverse().slice(10);
}

async function fetchHbData() {
    let resp = await fetchJsonp("https://interface.sina.cn/news/wap/historydata.d.json?province=hubei"),
        json = await resp.json();

    return json.data.historylist.reverse().slice(10);
}

enum CountType {
    Sub = 1,
    CnAdd = 2,
    HbAdd = 3,
    Cn = 4,
    Hb = 5
};

async function draw() {
    let cnData = await fetchCnData(),
        hbData = await fetchHbData();

    console.log(cnData, hbData);

    function drawData(type: string, title: string, countType: CountType) {
        let datasets: ChartDataSets = {
            label: title,
            data: []
        },
        data: ChartData = {
            labels: [],
            datasets: [datasets]
        };

        let lastCn = 0, lastHb = 0;

        for (let i = 0; i < cnData.length; i ++) {
            let currCn = cnData[i]['cn_' + type + 'Num'],
                currHb = hbData[i][type + 'Num'],
                currCnAdd = currCn - lastCn,
                currHbAdd = currHb - lastHb,
                date = cnData[i].date,
                count = 0;

            data.labels?.push(date);

            switch (countType) {
                case CountType.Sub:
                    count = currCnAdd - currHbAdd;
                    break;
                case CountType.Cn:
                    count = currCn;
                    break
                case CountType.CnAdd:
                    count = currCnAdd;
                    break;
                case CountType.Hb:
                    count = currHb;
                    break;
                case CountType.HbAdd:
                    count = currHbAdd;
                    break;
            }

            datasets.data?.push(count);

            lastCn = currCn;
            lastHb = currHb;
        }

        new Chart(createCanvas(), {
            type: "line",
            data: data
        });
    }

    drawData('con', '湖北新增确诊病例', CountType.HbAdd);
    drawData('con', '全国除湖北新增确诊病例', CountType.Sub);
    drawData('sus', '全国新增疑似病例', CountType.CnAdd);
    drawData('death', '全国除湖北新增死亡病例', CountType.Sub);
    drawData('cure', '全国除湖北新增治愈病例', CountType.Sub);
    drawData('cure', '湖北新增治愈病例', CountType.HbAdd);
}

draw();