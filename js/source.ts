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
    let resp = await fetchJsonp("https://interface.sina.cn/news/wap/" + url);
    return await resp.json();
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
        hbData = hbHistoryData.data.historylist.slice(0).reverse().slice(9);

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

    function drawData(type: string, title: string, countType: CountType) {
        let datasets: ChartDataSets = {
            label: title,
            data: []
        },
        data: ChartData = {
            labels: [],
            datasets: [datasets]
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

        new Chart(createCanvas('#main'), {
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
    drawMap();
}

draw();