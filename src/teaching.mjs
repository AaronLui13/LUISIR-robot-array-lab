const notes = [
 {title:'前置｜嵌套循環',id:'3de08b2fdbd081e18eaad86206b6e80a'},
 {title:'01｜認識、建立與修改二維陣列',id:'3de08b2fdbd0813c9b58e84b5e2d20d1'},
 {title:'02｜遍歷、計數與統計',id:'3de08b2fdbd081ad8fc8f6c92ac0cc71'},
 {title:'03｜搜尋與回傳位置',id:'3de08b2fdbd08148ab7fd67f0ffc7c09'},
 {title:'04｜二維與一維索引轉換',id:'3dd08b2fdbd08161b76ad2be5c7002f2'},
 {title:'05｜棋盤移動、鄰格與邊界',id:'3de08b2fdbd0811395e2f65d5ee544d2'},
 {title:'06｜遍歷次序與蛇形編號',id:'3de08b2fdbd081eaacefed274b99f62a'},
 {title:'07｜座標變換與圖像操作',id:'3de08b2fdbd08128a5a9d357b5e6ad19'},
 {title:'08｜局部區域與綜合應用',id:'3de08b2fdbd0819d99e2dfabfcbf02d7'}
];
const chapters = [[1],[1],[1],[0,2],[2],[3],[3],[4],[4],[5],[5],[6],[6],[7],[7],[8],[8],[3,4,5,8]];
export const teachingReferences = id => chapters[id].map(chapter=>notes[chapter]);
