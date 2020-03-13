import fetchJsonp from 'fetch-jsonp';
import 'regenerator-runtime/runtime';
import Chart, { ChartDataSets, ChartData } from 'chart.js';
import 'chartjs-plugin-colorschemes';

/**
 * 创建 canvas
 * @param sel 选择器
 */
function createCanvas(sel: string): CanvasRenderingContext2D {
    let canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d');

    document.querySelector(sel)?.appendChild(canvas);

    if (null == ctx) {
        throw new Error("ctx is null");
    }

    return ctx;
}

/**
 * 获取新浪接口数据
 * @param url 地址
 */
async function fetchData(url: string) {
    let resp = await fetchJsonp("https://interface.sina.cn/news/wap/" + url, {timeout: 5000});
    return await resp.json();
}

async function fetchFixedData() {
    let resp = await fetchJsonp("https://joyqi.com/proxy.php?url="
        + encodeURIComponent("https://c.m.163.com/ug/api/wuhan/app/data/list-total"), {timeout: 5000}),
        result = await resp.json();

    return result.contents.data.chinaDayList;
}

enum CountType {
    Sub = 1,
    CnAdd = 2,
    HbAdd = 3,
    Cn = 4,
    Hb = 5
};

async function draw() {
    let mapData = await fetchData("fymap2020_data.d.json"),
        hbHistoryData = await fetchData("historydata.d.json?province=hubei"),
        cnData = mapData.data.historylist.slice(0).reverse().slice(9),
        hbData = hbHistoryData.data.historylist.slice(0).reverse().slice(9),
        fixedData = (await fetchFixedData()).slice(1);

    function drawFixed() {
        let datasetsA: ChartDataSets = {
            label: "新增疑似病例",
            data: [],
            fill: false
        },
        datasetsB: ChartDataSets = {
            label: "现存疑似病例",
            data: [],
            fill: false
        },
        datasetsC: ChartDataSets = {
            label: "当前湖北在院治疗",
            data: [],
            fill: false
        },
        datasetsD: ChartDataSets = {
            label: "当前除湖北在院治疗",
            data: [],
            fill: false
        },
        dataA: ChartData = {
            labels: [],
            datasets: [datasetsA, datasetsB]
        },
        dataB: ChartData = {
            labels: [],
            datasets: [datasetsC, datasetsD]
        };

        fixedData.forEach((value: any, i: number) => {
            let treating = value.total.confirm - value.total.heal - value.total.dead,
                treatingHb = hbData[i + 1].conNum - hbData[i + 1].cureNum - hbData[i + 1].deathNum,
                [year, month, day] = value.date.split('-');

            dataA.labels?.push(month + '.' + day);
            dataB.labels?.push(month + '.' + day);
            datasetsA.data?.push(value.today.suspect);
            datasetsB.data?.push(value.total.suspect);
            datasetsC.data?.push(treatingHb);
            datasetsD.data?.push(treating - treatingHb);
        });

        new Chart(createCanvas('#main'), {
            type: "line",
            data: dataA,
            options: {
                plugins: {
                    colorschemes: {
                        scheme: 'brewer.SetOne3'
                    }
                }
            }
        });

        new Chart(createCanvas('#main'), {
            type: "line",
            data: dataB,
            options: {
                plugins: {
                    colorschemes: {
                        scheme: 'brewer.DarkTwo3'
                    }
                }
            }
        });
    }

    function drawMap() {
        let i = 0, finished = 0, percent = 0,
            btn = document.querySelector('#generate'),
            datasets: ChartDataSets = {
                label: "今日全国除湖北重点新增病例分布",
                data: []
            },
            data: ChartData = {
                labels: [],
                datasets: [datasets]
            },
            datasetsIncr: ChartDataSets = {
                label: "今日全国除湖北重点新增病例增幅",
                data: []
            },
            dataIncr: ChartData = {
                labels: [],
                datasets: [datasetsIncr]
            },
            totalIncr = (mapData.data.historylist[0].cn_conNum - mapData.data.historylist[1].cn_conNum)
                - (hbHistoryData.data.historylist[0].conNum - hbHistoryData.data.historylist[1].conNum);

        btn?.addEventListener('click', () => {
            btn?.setAttribute('disabled', 'disabled');

            let intv = setInterval(async () => {
                if (i == mapData.data.list.length) {
                    clearInterval(intv);

                    new Chart(createCanvas('#map'), {
                        type: "doughnut",
                        data: data,
                        options: {
                            plugins: {
                                colorschemes: {
                                    scheme: 'brewer.Paired12'
                                }
                            }
                        }
                    });

                    new Chart(createCanvas('#map'), {
                        type: "bar",
                        data: dataIncr,
                        options: {
                            plugins: {
                                colorschemes: {
                                    scheme: 'brewer.Paired12'
                                }
                            }
                        }
                    });

                    return;
                }

                let item = mapData.data.list[i];
                i ++;

                if (item.ename == 'hubei') {
                    finished ++;
                    return;
                }
                
                let historyData = await fetchData("historydata.d.json?province=" + item.ename),
                    incr = historyData.data.historylist[0].conNum - historyData.data.historylist[1].conNum,
                    incrPercent = historyData.data.historylist[0].conNum / historyData.data.historylist[1].conNum;
                finished ++;
                percent = Math.ceil(finished * 100 / mapData.data.list.length);

                // 影响大于2%的需要重点关注
                if (incr / totalIncr >= 0.02) {
                    data.labels?.push(item.name);
                    dataIncr.labels?.push(item.name);
                    datasets.data?.push(incr);
                    datasetsIncr.data?.push(incrPercent);
                }

                if (btn !== null) {
                    btn.textContent = "已获取 " + item.name + " 进度 " + percent + "%";
                }
            }, 2000);
        });
    }

    function generateData() {
        let data: ChartData = {
            labels: [],
            datasets: []
        };

        cnData.slice(1).forEach((value: any) => {
            data.labels?.push(value.date);
        });

        return data;
    }

    function generateDatasets(type: string, title: string, countType: CountType) {
        let datasets: ChartDataSets = {
            label: title,
            data: [],
            fill: false
        };

        let lastCn = cnData[0]['cn_' + type + 'Num'],
            lastHb = hbData[0][type + 'Num'];

        for (let i = 1; i < cnData.length; i ++) {
            let currCn = cnData[i]['cn_' + type + 'Num'],
                currHb = hbData[i][type + 'Num'],
                currCnAdd = currCn - lastCn,
                currHbAdd = currHb - lastHb,
                date = cnData[i].date,
                count = 0;

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

        return datasets;
    }

    function drawConfirmed() {
        let data = generateData();

        data.datasets?.push(generateDatasets('con', '湖北新增确诊', CountType.HbAdd));
        data.datasets?.push(generateDatasets('con', '除湖北新增确诊', CountType.Sub));

        new Chart(createCanvas('#main'), {
            type: 'line',
            data: data,
            options: {
                plugins: {
                    colorschemes: {
                        scheme: 'office.Concourse6'
                    }
                }
            }
        });
    }

    function drawCure() {
        let data = generateData();

        data.datasets?.push(generateDatasets('cure', '除湖北新增治愈', CountType.Sub));
        data.datasets?.push(generateDatasets('cure', '湖北新增治愈', CountType.HbAdd));
        data.datasets?.push(generateDatasets('death', '除湖北新增死亡', CountType.Sub));
        data.datasets?.push(generateDatasets('death', '湖北新增死亡', CountType.HbAdd));

        new Chart(createCanvas('#main'), {
            type: 'line',
            data: data,
            options: {
                plugins: {
                    colorschemes: {
                        scheme: 'office.Circuit6'
                    }
                }
            }
        });
    }

    drawFixed();
    drawConfirmed();
    drawCure();
    drawMap();
}

draw();
